from flask import Flask, request, jsonify, make_response
from pymongo import MongoClient, errors
from flask_cors import CORS
from bson.objectid import ObjectId
from bson.errors import InvalidId
import logging, os, bson
from werkzeug.utils import secure_filename
from datetime import datetime
from bson.json_util import dumps

app = Flask(__name__)
cors = CORS(app, resources={r"/api/*": {"origins": "http://localhost:4200", "methods": ["GET", "POST", "PUT", "DELETE"]}})

client = MongoClient( "mongodb://127.0.0.1:27017" )# DB Connection
db = client.bookish  # Selecting DB
books = db.library  # Library collection
discussions = db.discussion # Discussion board collection
users = db.users
requests = db.requests

#configuring  image upload folder and path
upload_folder = os.path.join(os.path.dirname(__file__), "src", "assets", "images")
app.config['UPLOAD_FOLDER'] = upload_folder
ALLOWED_EXTENSIONS = {'jpg', 'jpeg'}

logging.basicConfig(filename='app.log', level=logging.DEBUG)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

#Discussion Board 

#Posts

#Get all posts
@app.route("/api/v1.0/books/posts", methods=["GET"])
def get_all_posts():
    page_num, page_size = 1, 10
    if request.args.get('pn'):
        page_num = int(request.args.get('pn'))
    if request.args.get('ps'):
        page_size = int(request.args.get('ps'))
    page_start = (page_size * (page_num - 1))

    data_to_return = []
    
    for post in discussions.find().skip(page_start).limit(page_size):
        post["_id"] = str(post["_id"])

        #Safely handle comments
        comments = post.get("comments", [])
        for comment in comments:
             comment["_id"] = str(comment["_id"])

        data_to_return.append(post)

    return make_response(jsonify(data_to_return), 200)

#Get one post
@app.route("/api/v1.0/books/posts/<string:id>", methods=["GET"])
def get_one_post(id):
    post = discussions.find_one({"_id": ObjectId(id)})
    if post is not None:
        post["_id"] = str(post["_id"])

        #Safely handle comments
        comments = post.get("comments", [])
        for comment in comments:
             comment["_id"] = str(comment["_id"])

        return make_response(jsonify(post), 200)
    else:
        return make_response(jsonify({"error": "Invalid Post ID"}), 404)
    
#Add a post
@app.route("/api/v1.0/books/posts", methods=["POST"])
def add_post():
    data = request.get_json()  # Get data as JSON
    if data:
        username = data.get('username')
        post = data.get('post')
        if username and post:
            new_post = {
                "username": username,
                "post": post
            }
            new_post_id = discussions.insert_one(new_post)
            new_post_url = "http://localhost:5000/api/v1.0/books/posts/" + str(new_post_id.inserted_id)
            return make_response(jsonify({"url": new_post_url}), 201)
    return make_response(jsonify({"error": "Both Username and Post fields are required"}), 400)

    
#Edit a post
@app.route("/api/v1.0/books/posts/<string:id>", methods=["PUT"])
def edit_post(id):
    if "username" in request.form and "post" in request.form:
        username = request.form['username']
        post = request.form['post']
        if username and post:  # Check if both fields are not null
            result = discussions.update_one(
                { "_id" : ObjectId(id)},
                {
                    "$set" : {
                        "username" : username,
                        "post" : post
                    }
                }
            )
            if result.matched_count == 1:
                edited_post_url = "http://localhost:5000/api/v1.0/posts/" + id
                return make_response(jsonify({"url": edited_post_url}), 200)
    return make_response(jsonify({"error": "Both 'username' and 'post' fields are required"}), 400)

#Delete Post
@app.route("/api/v1.0/books/posts/<string:id>", methods=["DELETE"])
def delete_post(id):
    result = discussions.delete_one( { "_id" : ObjectId(id) } )
    if result.deleted_count == 1:
        return make_response( jsonify( {"message": "Post Deleted"}), 204)
    else:
        return make_response( jsonify( { "error" : "Invalid Post ID" } ), 404 )

#Book of the Month
@app.route("/api/v1.0/home", methods=["GET"])
def highest_rated_book():
    # Find the highest-rated book
    highest_rated_book = books.find_one(
        filter={},
        sort=[('averageRating', -1)],
        limit=1
    )
    if highest_rated_book:
        # Convert ObjectId to string
        highest_rated_book['_id'] = str(highest_rated_book['_id'])
        
        response_data = {
            'message': 'Highest-rated book retrieved successfully',
            'highest_rated_book': highest_rated_book
        }
        return make_response(jsonify(response_data), 200)
    else:
        return make_response(jsonify({'error': 'No highest-rated book found'}), 404)

#Comments

#Fetch all comments
@app.route("/api/v1.0/books/posts/<string:id>/comments", methods=["GET"])
def get_all_comments(id):
    data_to_return = []
    post = discussions.find_one( { "_id" : ObjectId(id) }, { "comments" : 1, "_id" : 0})
    if "comments" in post:
        for comment in post["comments"]:
            comment["_id"] = str(comment["_id"])
            data_to_return.append(comment)
    return make_response( jsonify( data_to_return), 200)

#Add new comment
@app.route("/api/v1.0/books/posts/<string:id>/comments", methods=["POST"])
def add_comment(id):
    username = request.json.get('username')
    comment = request.json.get('comment')

    if username and comment:  # Check if both fields are not null
        new_comment = {
            "_id": ObjectId(),  # Use the ObjectId from the post document
            "username": username,
            "comment": comment
        }
        discussions.update_one({"_id": ObjectId(id)}, {"$push": {"comments": new_comment}})
        new_comment_url = "http://localhost:5000/api/v1.0/books/posts/" + id + "/comments/" + str(new_comment['_id'])
        return make_response(jsonify({"url": new_comment_url}), 201)
    else:
        return make_response(jsonify({"error": "Both 'username' and 'comment' fields are required"}), 400)

#Get one comment
@app.route("/api/v1.0/books/posts/<string:id>/comments/<string:c_id>", methods=["GET"])
def get_one_comment(id, c_id):
    post = discussions.find_one(
        { "comments._id" : ObjectId(c_id) },
        { "_id" : 0, "comments.$" : 1}
    )
    if post is None:
        return make_response( jsonify ( { "error" : "Invalid Post ID"} ), 404 )
    else:
        post["comments"][0]["_id"] = str(post["comments"][0]["_id"])
        return make_response(jsonify( post ["comments"][0]), 200)
    
#Edit Comment
@app.route("/api/v1.0/books/posts/<string:id>/comments/<string:c_id>", methods=["PUT"])
def edit_comment(id, c_id):
    username = request.form.get("username")
    comment = request.form.get("comment")

    if username and comment:
        edited_comment = {
            "comments.$.username": username,
            "comments.$.comment": comment
        }
        discussions.update_one(
            {"comments._id": ObjectId(c_id)},
            {"$set": edited_comment}
        )

        edited_comment_url = f"http://localhost:5000/api/v1.0/posts/{id}/comment/{c_id}"
        return make_response(jsonify({"url": edited_comment_url}), 200)
    else:
        return make_response(jsonify({"error": "Both 'username' and 'comment' fields are required"}), 400)
    
#Delete Comment
@app.route("/api/v1.0/books/posts/<string:id>/comments/<string:c_id>", methods=["DELETE"])
def delete_comment(id, c_id):
    discussions.update_one(
        {"_id": ObjectId(id)},
        {"$pull": {"comments": {"_id": ObjectId(c_id)}}}
    )
    return make_response(jsonify({}), 204)

#Books
#Get all books
@app.route("/api/v1.0/books", methods=["GET"])
def get_books():
    # Set default values for pagination
    page_num, page_size = 1, 10
    if request.args.get('pn'):
        page_num = int(request.args.get('pn'))
    if request.args.get('ps'):
        page_size = int(request.args.get('ps'))
    page_start = (page_size * (page_num - 1))
    # Sorting
    sort_field = request.args.get('sortField', 'title')
    sort_direction = 1 if request.args.get('sortDirection', 'asc').lower() == 'asc' else -1
    # Search query
    query = request.args.get('query', '')

    # Construct filter criteria based on the provided query and any additional filters
    filter_criteria = {'$or': [{'title': {'$regex': f'.*{query}.*', '$options': 'i'}},
                               {'author': {'$regex': f'.*{query}.*', '$options': 'i'}}]}
    # Add additional filter criteria 
    mood = request.args.get('mood')
    genre = request.args.get('genre')

    if genre:
        # Split the genre string into a list of individual genres
        genres_list = genre.split(',')
        # Add the filter criteria for genres using the $in operator
        filter_criteria['genre'] = {'$in': genres_list}

    if mood:
        # Split the mood string into a list of individual moods
        moods_list = mood.split(',')
        # Convert all moods to lowercase
        moods_list = [m.lower() for m in moods_list]
        # Add the filter criteria for moods using the $in operator
        filter_criteria['reviews.mood'] = {'$in': moods_list}

    all_books_cursor = books.find(filter_criteria)
    # Sort all books by the specified field and direction
    all_books_sorted = sorted(all_books_cursor, key=lambda x: x.get(sort_field, ''), reverse=(sort_direction == -1))

    # Apply pagination to the sorted list
    page_start = (page_size * (page_num - 1))
    books_to_return = all_books_sorted[page_start:page_start + page_size]

    # Convert ObjectId to string and handle other transformations if needed
    data_to_return = []
    for book in books_to_return:
        book["_id"] = str(book["_id"])
        # Safely handle reviews
        reviews = book.get("reviews", [])
        for review in reviews:
            review["_id"] = str(review["_id"])
        # Safely handle ratings
        ratings = book.get("ratings", [])
        for rating in ratings:
            rating['_id'] = str(rating["_id"])
        data_to_return.append(book)

    return make_response(jsonify(data_to_return), 200)


#Add Book
@app.route("/api/v1.0/books", methods=["POST"])
def add_book():
    # Check if the required fields 'title', 'author', and 'ISBN' are in the form 
    if "title" in request.form and "author" in request.form and "ISBN" in request.form:
        # Check if 'imageLink' is present in request.files
        if "imageLink" in request.files:
            file = request.files["imageLink"]
            # Check if the file is not empty and has an allowed file type.
            if file and allowed_file(file.filename):
                #Securing the filename
                filename = secure_filename(file.filename)
                #Path to save the file
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                #Creating the new document with the mongo fields mapping to the form fields
                new_book = {
                    "title": request.form["title"],
                    "author": request.form["author"],
                    "ISBN": request.form["ISBN"],
                    "text": [],
                    "genre": request.form.getlist("genre"),
                    "imageLink": filename  
                }
                #inserting the new document into the db
                new_book_id = books.insert_one(new_book)
                new_book_link = "http://localhost:5000/api/v1.0/books/" + str(new_book_id.inserted_id)
                return make_response(jsonify({"url": new_book_link}), 201)
            else:
                return make_response(jsonify({"error": "Invalid or missing file"}), 400)
        else:
            return make_response(jsonify({"error": "Missing 'imageLink' in form data"}), 400)
    else:
        return make_response(jsonify({"error": "Missing form data"}), 400)


#Editing Book
@app.route("/api/v1.0/books/<string:id>", methods = ["PUT"])
def edit_book(id):
        if "title" in request.form and "author" in request.form and "ISBN" in request.form:
            result = books.update_one(
                { "_id" : ObjectId(id)},
                {
                    "$set" : {
                        "title" : request.form["title"],
                        "author" : request.form["author"],
                        "ISBN" : request.form["ISBN"]
                    }
                }
            )
            if result.matched_count == 1:
                edited_book_link = "http://localhost:5000/api/v1.0/books/" + id
                return make_response( jsonify( { "url" : edited_book_link } ), 200)
            else:
                return make_response( jsonify( { "error " : "Invalid book ID" } ), 404)
        else:
            return make_response( jsonify( { "error " : "Missing form data" } ), 404)

#Get one Book
@app.route("/api/v1.0/books/<string:id>", methods=["GET"])
def get_book(id):
    book = books.find_one({"_id" : ObjectId(id)})
    if book is not None:
        book["_id"] = str(book["_id"])
        # Safely handle reviews
        reviews = book.get("reviews", [])
        for review in reviews:
            review["_id"] = str(review["_id"])
        # Safely handle ratings
        ratings = book.get("ratings", [])
        for rating in ratings:
            rating['_id'] = str(rating["_id"])
        return make_response(jsonify(book), 200)
    else:
        return make_response(jsonify({"error": "Invalid Book ID"}), 404)

#Delete Book
@app.route("/api/v1.0/books/<string:id>", methods=["DELETE"])
def delete_book(id):
    try:
        # Add logging to check the received ID
        app.logger.info(f"Attempting to delete book with ID: {id}")
        result = books.delete_one({"_id": ObjectId(id)})
        # Add logging to check the result
        app.logger.info(f"Deletion result: {result.deleted_count}")

        if result.deleted_count == 1:
            return make_response(jsonify({}), 204)
        else:
            return make_response(jsonify({"error": "Invalid book ID"}), 404)
    except Exception as e:
        app.logger.error(f"Error deleting book: {str(e)}")
        return make_response(jsonify({"error": "Internal server error"}), 500)

#Reviews 
    
#Get All Reviews
@app.route("/api/v1.0/books/<string:id>/reviews", methods=["GET"])
def get_all_reviews(id):
    data_to_return = []
    book = books.find_one( { "_id" : ObjectId(id) }, { "reviews" : 1, "_id" : 0} )
    if "reviews" in book:
        for review in book["reviews"]:
            review["_id"] = str(review["_id"])
            data_to_return.append(review)
    return make_response( jsonify( data_to_return ), 200)

#Get Review
@app.route("/api/v1.0/books/<string:id>/reviews/<string:r_id>", methods=["GET"])
def get_review(id, r_id):
    book = books.find_one( 
        {"reviews._id" : ObjectId(r_id)},
        { "_id" : 0, "reviews.$" : 1}
    )
    if book is None:
        return make_response( jsonify ( { "error" : "Invalid book ID"} ), 404 )
    else:
        book["reviews"][0]["_id"] = str(book["reviews"][0]["_id"])
        return make_response(jsonify( book ["reviews"][0]), 200)

#Add Review
@app.route("/api/v1.0/books/<string:id>/reviews", methods=["POST"])
def add_new_review(id):
    #Extract JSON data from the request
    data = request.get_json()
    #Check all the required fields are present
    if data and "username" in data and "review" in data and "rating" in data and "mood" in data:
        #New review data
        new_review = {
            "_id": ObjectId(),  # Generate a new ObjectId for the review
            "date": datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT"),
            "username": data["username"],
            "review": data["review"],
            "rating": data["rating"],
            "mood" : data["mood"]
        }

        try:
            #Try to add the new review 
            result = books.update_one(
                {"_id": ObjectId(id)},
                {"$push": {"reviews": new_review}}
            )
            #Check if the book was found
            if result.matched_count == 0:
                return make_response(jsonify({'error': 'Book not found'}), 404)
            new_review_link = "http://localhost:5000/api/v1.0/books/" + id + "/reviews/" + str(new_review['_id'])
            #Return a sucessful response with the new URL
            return make_response(jsonify({"url": new_review_link}), 201)
        except bson.errors.InvalidId:
            #Error if the id is invalid
            return make_response(jsonify({"error": "Invalid ObjectId", "details": "Invalid book ID"}), 400)
    else:
        #Error if fields are missing
        return make_response(jsonify({"error": "Validation failed", "details": "Invalid data"}), 400)

#Edit Review
@app.route("/api/v1.0/books/<string:id>/reviews/<string:r_id>", methods=["PUT"])
def edit_review(id, r_id):
    data = request.get_json()
    #form validation
    if data and "username" in data and "review" in data and "rating" in data and "mood" in data:
        #Preparing the edited data whilst keeping the origional ID
        edited_review = {
            "reviews.$._id": ObjectId(r_id),  # Preserve the original _id
            "reviews.$.username": data["username"],
            "reviews.$.review": data["review"],
            "reviews.$.rating": data["rating"],
            "reviews.$.mood" : data["mood"]
        }
        #Updating the specific review by the review ID 
        result = books.update_one(
            {"reviews._id": ObjectId(r_id)},
            {"$set": edited_review}
        )
        #Check if the review was found and updated
        if result.matched_count == 0:
            return make_response(jsonify({'error': 'Review not found'}), 404)
        #Return a success response for the update
        return make_response(jsonify({"message": "Review updated successfully"}), 200)
    else:
        #Error if the validation is not met
        return make_response(jsonify({"error": "Validation failed", "details": "Invalid data"}), 400)

#Delete review
@app.route("/api/v1.0/books/<string:id>/reviews/<string:r_id>", methods=["DELETE"])
def delete_review(id, r_id):
    try:
        book_id = ObjectId(id)
        review_id = ObjectId(r_id)
    except bson.errors.InvalidId:
        return make_response(jsonify({'error': 'Invalid book or review ID'}), 400)

    result = books.update_one(
        {"_id": book_id},
        {"$pull": {"reviews": {"_id": review_id}}}
    )

    if result.matched_count == 0:
        return make_response(jsonify({'error': 'Book or review not found'}), 404)

    return make_response(jsonify({}), 204)

# Get all users
@app.route('/api/v1.0/books/users', methods=['GET'])
def get_users():
    data_to_return = []
    # Using find() to fetch all users. Adjust projection as needed.
    for user in users.find({}, {"username": 1, "_id": 1}):
        # Convert ObjectId to string
        user['_id'] = str(user['_id'])
        data_to_return.append(user)
    return make_response(jsonify(data_to_return), 200)

#Get user
@app.route("/api/v1.0/books/profile/<string:userId>", methods=["GET"])
def get_user_profile(userId):
    try:
        user = users.find_one({"userId": userId})
        if user:
            # Remove the ObjectId field
            user.pop('_id', None)
            # Convert ObjectId to string for any nested documents
            for book in user.get('tbr', []):
                book.pop('_id', None)
            return jsonify(user), 200
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
#Add user to database from auth0
@app.route('/api/v1.0/books/users', methods=['POST'])
def add_user():
    data = request.json
    #Check if username and userId is in the data
    if not data or 'username' not in data or 'userId' not in data:
        return jsonify({'error': 'Username and userId are required'}), 400

    # Check if the user already exists
    existing_user = users.find_one({'username': data['username']})
    if existing_user:
        # Returning the URL for the existing user instead of just a conflict message
        user_link = f"http://localhost:5000/api/v1.0/books/users/{str(existing_user['_id'])}"
        return jsonify({'message': 'User already exists', 'url': user_link}), 409

    try:
        #Attempt to insert the new user data into the database
        result = users.insert_one({'username': data['username'], 'userId': data['userId']})
        #Retrieve the ID of the newly inserted user
        new_user_id = str(result.inserted_id)
        #Create a URL that points to the new user's resource
        new_user_link = f"http://localhost:5000/api/v1.0/books/users/{new_user_id}"
        #Return a success response with the URL of the new user
        return jsonify({'message': 'User added successfully', 'url': new_user_link}), 201
    except Exception as e:
        #Log the error and return a server error response if something goes wrong
        app.logger.error(f"Error adding user: {e}")
        return jsonify({'error': 'An error occurred while adding the user'}), 500

#Delete User
@app.route("/api/v1.0/books/profile/<string:userId>", methods=["DELETE"])
def delete_user_profile(userId):
    try:
        # Check if the user exists
        user = users.find_one({"userId": userId})
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Delete the user
        users.delete_one({"userId": userId})
        
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1.0/books/profile/<string:userId>', methods=['POST'])
def add_book_to_profile(userId):
    try:
        #Get JSON data
        book_data = request.json
        # Get 'bookId' and 'title' from the JSON data
        book_id = book_data.get('bookId')
        title = book_data.get('title')
        #Check for the presence of required data fields
        if not book_id or not title:
            return jsonify({'error': 'Missing required fields'}), 400
        #Locate the user in the user collection using 'userId'
        user = users.find_one({'userId': userId})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        #Retrieve the user's existing TBR list, defaulting to an empty list if none exists
        existing_books = user.get('tbr', [])
        for book in existing_books:
            #Check if the book is already in the TBR list
            if book['bookId'] == book_id:
                #Return an error if the book already exists
                return jsonify({'error': 'Book already added to TBR'}), 409
        #Construct the book document to add to the TBR
        book = {
            '_id': ObjectId(),
            'bookId': book_id,
            'title': title,
            'author': book_data.get('author'),
            'ISBN': book_data.get('ISBN'),
            'averageRating': book_data.get('averageRating'),
            'numberOfPages': book_data.get('numberOfPages'),
            'yearPublished': book_data.get('yearPublished'),
            'imageLink': book_data.get('imageLink'),
            'genre': book_data.get('genre')
        }
        # Update the user's document to add the new book to the TBR list using $addToSet to avoid duplicates
        users.update_one({'userId': userId}, {'$addToSet': {'tbr': book}})
        # Generate a URL
        user_link = f"http://localhost:5000/api/v1.0/books/profile/{userId}"
        #Return a success response with a link to the user's profile
        return jsonify({'message': 'Book added to TBR successfully', 'userUrl': user_link}), 200
    except Exception as e:
        #Error response
        return jsonify({'error': str(e)}), 500
    
@app.route("/api/v1.0/books/profile/<string:userId>/tbr/<string:bookId>", methods=["DELETE"])
def delete_book_from_tbr(userId, bookId):
    try:
        # Find the user by userId
        user = users.find_one({"userId": userId})
        if user:
            # Find the index of the book to be deleted
            index_to_delete = -1
            for i, book in enumerate(user["tbr"]):
                if str(book.get("bookId")) == bookId:
                    index_to_delete = i
                    break
            # If the book is found in the user's TBR list, remove it
            if index_to_delete != -1:
                del user["tbr"][index_to_delete]
                # Update the user's document in the database
                users.update_one({"userId": userId}, {"$set": {"tbr": user["tbr"]}})
                return jsonify({"message": "Book deleted from TBR list successfully"}), 200
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1.0/books/genres', methods=['GET'])
def get_genres():
    try:
        # Query MongoDB to fetch distinct genres
        distinct_genres = books.distinct('genre')
        return jsonify(distinct_genres), 200
    except Exception as e:
        print("Error fetching genres:", e)
        return jsonify({'error': 'Internal server error'}), 500

#Post admin requests
@app.route('/api/v1.0/admin/data-requests', methods=['POST'])
def post_user_data():
    # Extract data from the request
    data = request.json
    user_id = data.get('userId')
    username = data.get('username')

     # Check if userId and username are present
    if not user_id or not username:
        return jsonify({'error': 'Missing required fields (userId and/or username)'}), 400

    # Handle the data request 
    new_request = {
        'userId': user_id,
        'username': username
    }
    
    # Insert the new request into MongoDB
    new_request_id = requests.insert_one(new_request)
    new_request_url = "http://localhost:5000/api/v1.0/admin/data-requests/" + str(new_request_id.inserted_id)
    return jsonify({"url": new_request_url}), 201

# Get one admin request
@app.route('/api/v1.0/admin/data-requests/<string:request_id>', methods=['GET'])
def get_one_request(request_id):
    # Find the request by its ID
    request_data = requests.find_one({'_id': ObjectId(request_id)})
    if request_data:
        # Convert ObjectId to string
        request_data['_id'] = str(request_data['_id'])
        return jsonify(request_data), 200
    else:
        return jsonify({'error': 'Request not found'}), 404

# Get all admin requests
@app.route('/api/v1.0/admin/data-requests', methods=['GET'])
def get_all_requests():
    # Retrieve all requests from the collection
    all_requests = list(requests.find({}))
    # Convert ObjectId to string for each request
    for request_data in all_requests:
        request_data['_id'] = str(request_data['_id'])
    return jsonify(all_requests), 200



if __name__ == "__main__":
    app.run(debug=True)
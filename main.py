from app import app, configure_routes

# Configure all routes
configure_routes()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

from flask import Flask, request, jsonify
import warnings
import traceback

# --- 1. Import your core inference function ---
# We are importing the function from the 'inference.py' file you just created.
# This keeps our API code clean and separate from the model logic.
try:
    from inference import predict_threat
except ImportError:
    print("FATAL ERROR: Could not import 'predict_threat' from 'inference.py'.")
    print("Please ensure 'inference.py' is in the same directory as 'app.py'.")
    exit()

warnings.filterwarnings('ignore')

# --- 2. Initialize the Flask Application ---
# This creates the web server.
app = Flask(__name__)
print("Flask application initialized.")


# --- 3. Define the API Endpoint ---
@app.route('/predict', methods=['POST'])
def handle_prediction():
    """
    This function is the core of the API. It listens for POST requests on the /predict URL.
    It expects a JSON payload with the raw request data.
    """
    print("\nReceived a new request on /predict endpoint...")

    # --- Input Validation ---
    if not request.is_json:
        print("Error: Request is not in JSON format.")
        return jsonify({"error": "Invalid input: request must be in JSON format."}), 400

    data = request.get_json()
    print(f"Request data: {data}")

    # Check for required fields
    required_fields = ['IP', 'Endpoint', 'User-Agent', 'Country', 'Date']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        error_msg = f"Missing required fields: {', '.join(missing_fields)}"
        print(f"Error: {error_msg}")
        return jsonify({"error": error_msg}), 400

    # --- Call the Model ---
    try:
        # Pass the validated JSON data directly to your prediction function
        result = predict_threat(data)
        
        # Return the prediction as a JSON response
        print("Successfully returned prediction.")
        return jsonify(result), 200

    except Exception as e:
        # A robust error handler for any unexpected issues during prediction
        error_details = traceback.format_exc()
        print(f"FATAL ERROR during prediction: {e}")
        print(f"Details: {error_details}")
        return jsonify({
            "error": "An internal error occurred during prediction.",
            "details": str(e)
        }), 500


# A simple root endpoint to confirm the API is running
@app.route('/')
def index():
    html_page = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Firewall Status</title>
    <style>
        /* --- Cyberpunk Theme Body --- */
        body {
            background-color: #0a0a1a; /* Dark cyber-blue background */
            color: #00ffff; /* Bright cyan text */
            font-family: 'Oxanium', 'Consolas', 'Courier New', monospace;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
        }

        /* --- Main Container for Circle + Ripples --- */
        .status-container {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            width: 300px;
            height: 300px;
        }

        /* --- The Central Circle --- */
        .circle {
            width: 100%;
            height: 100%;
            background-color: #1a1a2e;
            border-radius: 50%;
            border: 3px solid #00ffff;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 1.5px;
            /* --- Enhanced Glow Effect --- */
            box-shadow: 
                0 0 25px #00ffff,
                0 0 50px #00ffff,
                0 0 100px #00ffff,
                inset 0 0 20px #00ffffa0;
            z-index: 2;
            animation: pulse 2s infinite alternate;
        }

        /* --- Ripple Effect --- */
        .status-container::before,
        .status-container::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid #00ffff;
            transform: translate(-50%, -50%);
            z-index: 1;
            opacity: 0.7;
            animation: ripple 3s infinite ease-out;
        }

        .status-container::after {
            animation-delay: 1.5s;
        }

        /* --- Animation Keyframes --- */
        @keyframes ripple {
            0% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0.7;
            }
            100% {
                transform: translate(-50%, -50%) scale(2.5);
                opacity: 0;
            }
        }

        @keyframes pulse {
            0% {
                box-shadow: 
                    0 0 25px #00ffff,
                    0 0 50px #00ffff,
                    0 0 100px #00ffff,
                    inset 0 0 20px #00ffffa0;
            }
            100% {
                box-shadow: 
                    0 0 35px #00ffff,
                    0 0 70px #00ffff,
                    0 0 140px #00ffff,
                    inset 0 0 30px #00ffffa0;
            }
        }
    </style>
    <!-- Cyberpunk Font -->
    <link href="https://fonts.googleapis.com/css2?family=Oxanium:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="status-container">
        <div class="circle">AI FIREWALL<br>IS ON</div>
    </div>
</body>
</html>

    """
    return html_page


# --- 4. Run the Application ---
if __name__ == '__main__':
    # This makes the server accessible from other devices on your network.
    # The default port is 5050.
    app.run(host='0.0.0.0', port=5050, debug=False)

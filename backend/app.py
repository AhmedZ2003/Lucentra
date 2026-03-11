from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
from werkzeug.utils import secure_filename
import torch
import torchvision.transforms as transforms
import yaml
from get_speeds import get_speed
from model import SpeedEstimationModel_cnn_lstm

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Configuration
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Global model and config (loaded once at startup)
model = None
device = None
transform = None
config = None


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def load_model():
    """Load the trained model and configuration"""
    global model, device, transform, config
    
    # Load configuration
    config_path = os.path.join(os.path.dirname(__file__), 'configs.yaml')
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    # Setup device
    if config['device'] == 'auto':
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(config['device'])
    
    print(f"Using device: {device}")
    
    # Setup preprocessing transform
    image_size = tuple(config['preprocessing']['image_size'])
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Resize(image_size),
        transforms.Normalize(
            mean=config['preprocessing']['normalize']['mean'], 
            std=config['preprocessing']['normalize']['std']
        )
    ])
    
    # Initialize model
    model = SpeedEstimationModel_cnn_lstm(
        backbone=config['model']['backbone'],
        pretrained=config['model']['pretrained'],
        lstm_hidden_dim=config['model']['lstm_hidden_dim'],
        lstm_layers=config['model']['lstm_layers'],
        dropout=config['model']['dropout']
    ).to(device)
    
    # Load trained weights
    checkpoint_path = os.path.join(os.path.dirname(__file__), config['paths']['checkpoint'])
    
    if os.path.exists(checkpoint_path):
        checkpoint = torch.load(checkpoint_path, map_location=device)
        
        if 'model_state_dict' in checkpoint:
            model.load_state_dict(checkpoint['model_state_dict'])
            print(f"Loaded model from epoch {checkpoint.get('epoch', 'unknown')}")
        else:
            model.load_state_dict(checkpoint)
            print("Loaded model weights")
    else:
        print(f"Warning: No checkpoint found at {checkpoint_path}")
        print("Using untrained model")
    
    model.eval()
    print("Model loaded successfully")


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'device': str(device) if device else None
    })


@app.route('/api/analyze-video', methods=['POST'])
def analyze_video():
    """
    Endpoint to upload video and get speed predictions
    
    Expected: multipart/form-data with 'video' file
    Returns: JSON with speeds array
    """
    try:
        # Check if video file is present
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        file = request.files['video']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: mp4, avi, mov, mkv'}), 400
        
        # Save uploaded file temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(temp_path)
        
        try:
            # Run speed estimation
            print(f"Processing video: {filename}")
            speeds = get_speed(model, temp_path, device, transform)
            
            print(f"Processed {len(speeds)} frames")
            print(f"Speed range: {min(speeds):.2f} - {max(speeds):.2f} mph")
            
            # Clean up temporary file
            os.remove(temp_path)
            
            return jsonify({
                'success': True,
                'speeds': speeds,
                'frame_count': len(speeds),
                'avg_speed': sum(speeds) / len(speeds) if speeds else 0,
                'max_speed': max(speeds) if speeds else 0,
                'min_speed': min(speeds) if speeds else 0
            })
            
        except Exception as e:
            # Clean up on error
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e
            
    except Exception as e:
        print(f"Error processing video: {str(e)}")
        return jsonify({
            'error': f'Failed to process video: {str(e)}'
        }), 500


@app.route('/api/model-info', methods=['GET'])
def model_info():
    """Get information about the loaded model"""
    if model is None or config is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    return jsonify({
        'backbone': config['model']['backbone'],
        'lstm_hidden_dim': config['model']['lstm_hidden_dim'],
        'lstm_layers': config['model']['lstm_layers'],
        'image_size': config['preprocessing']['image_size'],
        'device': str(device)
    })


if __name__ == '__main__':
    # Load model at startup
    print("Loading model...")
    load_model()
    
    # Run Flask app
    print("Starting Flask server...")
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    )
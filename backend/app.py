from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS
    CORS(app)
    
    # Health Check Endpoint
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy", "service": "flask-automation-engine"}), 200
    
    # Register Blueprints
    from routes.webhooks import webhooks_bp
    from routes.automation import automation_bp
    from routes.admin import admin_bp
    
    app.register_blueprint(webhooks_bp, url_prefix='/api/webhooks')
    app.register_blueprint(automation_bp, url_prefix='/api/automation')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)

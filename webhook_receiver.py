from flask import Flask, request, jsonify
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

ADDRESS = "UQD1iKPmMEMWVeEn7DSlVR1B_ScNCmq03eRCA7azmYjEnHLI"

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    logger.info(f"Received webhook: {data}")

    account_id = data.get('account_id')
    tx_hash = data.get('tx_hash')
    lt = data.get('lt')

    print(f"\n{'='*50}")
    print(f"New transaction detected!")
    print(f"Account: {account_id}")
    print(f"Transaction Hash: {tx_hash}")
    print(f"Logical Time: {lt}")
    print(f"{'='*50}\n")

    return jsonify({'status': 'success'}), 200

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    print(f"Starting webhook receiver on port 5000...")
    print(f"Monitoring address: {ADDRESS}")
    app.run(host='0.0.0.0', port=5000)

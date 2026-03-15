# TON Transaction Webhook Setup

Monitor TON blockchain transactions for your address in real-time using TONConsole webhooks.

## Prerequisites

1. **Get API Key** from [tonconsole.com](https://tonconsole.com/)
2. **Install dependencies:**
   ```bash
   pip install httpx flask
   ```

## Quick Start

### 1. Start the Webhook Receiver

First, start a server to receive incoming webhooks:

```bash
python webhook_receiver.py
```

This runs on `http://localhost:5000/webhook`

### 2. Expose Your Local Server (for testing)

Use [ngrok](https://ngrok.com/) to expose your local server to the internet:

```bash
ngrok http 5000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 3. Register the Webhook

Set your environment variables and register:

**Windows:**
```cmd
set TONCONSOLE_API_KEY=your_api_key_here
set WEBHOOK_URL=https://abc123.ngrok.io/webhook
python register_webhook.py
```

**Linux/Mac:**
```bash
export TONCONSOLE_API_KEY=your_api_key_here
export WEBHOOK_URL=https://abc123.ngrok.io/webhook
python register_webhook.py
```

## Files

| File | Purpose |
|------|---------|
| `webhook_receiver.py` | Flask server that receives incoming webhook notifications |
| `register_webhook.py` | Script to create webhook and subscribe to your address |
| `test.py` | Original polling script (for reference) |

## Webhook Payload

When a transaction occurs, you'll receive:

```json
{
  "account_id": "0:8f2d840ec05d118f98459a057b1fcab535c57b9371222be15667fee932ceaf53",
  "lt": 49739623000001,
  "tx_hash": "653e593d581ad40d5d0868fe5d60008e1bfe9d2d4c4fa6b2ee5cd458741d7b59"
}
```

## API Endpoints

- **Create webhook:** `POST https://rt.tonapi.io/webhooks`
- **List webhooks:** `GET https://rt.tonapi.io/webhooks`
- **Delete webhook:** `DELETE https://rt.tonapi.io/webhooks/{id}`
- **Subscribe:** `POST https://rt.tonapi.io/webhooks/{id}/account-tx/subscribe`
- **Unsubscribe:** `POST https://rt.tonapi.io/webhooks/{id}/account-tx/unsubscribe`
- **Subscriptions:** `GET https://rt.tonapi.io/webhooks/{id}/account-tx/subscriptions`

## Production Deployment

For production, deploy your webhook receiver to:
- **Render.com**
- **Railway.app**
- **Fly.io**
- **Vercel** (with Flask adapter)

Then use your production URL as `WEBHOOK_URL`.

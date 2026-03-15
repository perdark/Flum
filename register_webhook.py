import httpx
import os

# Get your API key from https://tonconsole.com/
API_KEY = os.getenv("TONCONSOLE_API_KEY", "AEY5MJ5Z32ZHKCIAAAABF7KR6NCTASLSVAFMQMQW7RIFMUQKKWJSHBPFOBSTUKFYSFA7VLA")

# Your webhook endpoint URL (use ngrok or similar for local development)
# Example: "https://your-domain.com/webhook"
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "YOUR_WEBHOOK_URL_HERE")

# The address you want to monitor (converts to workable format)
# User-friendly format: UQD1iKPmMEMWVeEn7DSlVR1B_ScNCmq03eRCA7azmYjEnHLI
# Raw format: 0:8f2d840ec05d118f98459a057b1fcab535c57b9371222be15667fee932ceaf53
ADDRESS = "UQD1iKPmMEMWVeEn7DSlVR1B_ScNCmq03eRCA7azmYjEnHLI"

BASE_URL = "https://rt.tonapi.io/webhooks"


def convert_address(address: str) -> str:
    """Convert user-friendly address to raw format if needed"""
    # If address starts with "UQ" or "EQ", it's user-friendly format
    # We'll use it as-is for subscription
    return address


async def register_webhook():
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        # 1. Create a new webhook
        print("Creating new webhook...")
        response = await client.post(
            BASE_URL,
            headers=headers,
            json={"endpoint": WEBHOOK_URL}
        )

        if response.status_code != 200:
            print(f"Failed to create webhook: {response.text}")
            return

        webhook_data = response.json()
        webhook_id = webhook_data.get("id")
        print(f"✅ Webhook created! ID: {webhook_id}")
        print(f"   Endpoint: {webhook_data.get('endpoint')}")

        # 2. Subscribe to account transactions
        print(f"\nSubscribing to address: {ADDRESS}")
        response = await client.post(
            f"{BASE_URL}/{webhook_id}/account-tx/subscribe",
            headers=headers,
            json={"accounts": [{"account_id": ADDRESS}]}
        )

        if response.status_code == 200:
            print(f"✅ Successfully subscribed to {ADDRESS}")
        else:
            print(f"Failed to subscribe: {response.text}")

        # 3. List all webhooks
        print("\nCurrent webhooks:")
        response = await client.get(
            BASE_URL,
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            for wh in data.get("webhooks", []):
                print(f"  - ID: {wh['id']}, Endpoint: {wh['endpoint']}")

        # 4. List subscriptions for this webhook
        print(f"\nSubscriptions for webhook {webhook_id}:")
        response = await client.get(
            f"{BASE_URL}/{webhook_id}/account-tx/subscriptions?offset=0&limit=10",
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            for sub in data.get("account_tx_subscriptions", []):
                print(f"  - Account: {sub['account_id']}")
                print(f"    Last delivered LT: {sub.get('last_delivered_lt', 'N/A')}")


async def list_webhooks():
    """List all existing webhooks"""
    headers = {"Authorization": f"Bearer {API_KEY}"}

    async with httpx.AsyncClient() as client:
        response = await client.get(BASE_URL, headers=headers)
        if response.status_code == 200:
            data = response.json()
            print("Existing webhooks:")
            for wh in data.get("webhooks", []):
                print(f"  - ID: {wh['id']}, Endpoint: {wh['endpoint']}")
        else:
            print(f"Failed to list webhooks: {response.text}")


async def delete_webhook(webhook_id: int):
    """Delete a webhook"""
    headers = {"Authorization": f"Bearer {API_KEY}"}

    async with httpx.AsyncClient() as client:
        response = await client.delete(f"{BASE_URL}/{webhook_id}", headers=headers)
        if response.status_code == 200:
            print(f"✅ Webhook {webhook_id} deleted")
        else:
            print(f"Failed to delete: {response.text}")


if __name__ == "__main__":
    import asyncio

    if API_KEY == "YOUR_API_KEY_HERE":
        print("❌ Please set your TONCONSOLE_API_KEY environment variable")
        print("   Get your API key from https://tonconsole.com/")
        print("\n   Windows: set TONCONSOLE_API_KEY=your_key_here")
        print("   Linux/Mac: export TONCONSOLE_API_KEY=your_key_here")
    elif WEBHOOK_URL == "YOUR_WEBHOOK_URL_HERE":
        print("❌ Please set your WEBHOOK_URL environment variable")
        print("\n   For local testing, use ngrok:")
        print("   1. Install ngrok: https://ngrok.com/download")
        print("   2. Run: ngrok http 5000")
        print("   3. Copy the HTTPS URL and set as WEBHOOK_URL")
    else:
        asyncio.run(register_webhook())

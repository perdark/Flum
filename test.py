import httpx
import asyncio

ADDRESS = "UQD1iKPmMEMWVeEn7DSlVR1B_ScNCmq03eRCA7azmYjEnHLI"

async def monitor():
    async with httpx.AsyncClient() as client:
        # r = await client.get(
        #     f"https://tonapi.io/v2/blockchain/accounts/{ADDRESS}/transactions"
        # )
        transaction_id = "7bcd84b6a9ac7efced016ee3af3fa2bec961d9799ece7ec80ecce940011e2a5d"
        b = await client.get(
            f"https://tonapi.io/v2/blockchain/transactions/{transaction_id}"
        )
        data = b.json()
        print(data)

        # for tx in data["transactions"]:
        #     print(tx["hash"])

asyncio.run(monitor())





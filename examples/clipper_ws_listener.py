import asyncio, json
import websockets  # pip install websockets
WS_URL = "ws://127.0.0.1:17332"
async def main():
    async with websockets.connect(WS_URL) as ws:
        async for msg in ws:
            data = json.loads(msg)
            print("ACTIVE:", data)
if __name__ == "__main__":
    asyncio.run(main())

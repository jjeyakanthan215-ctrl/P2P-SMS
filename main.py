import uvicorn
import webbrowser
import threading
import time
import logging
import subprocess
import re

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

def open_browser():
    """Wait a bit for the server to start, then open the browser."""
    time.sleep(1.5)
    webbrowser.open("http://127.0.0.1:8005")

def start_tunnel():
    """Start an SSH tunnel to localhost.run for global internet access."""
    print("\n[+] Starting Global Internet Tunnel... (Please wait)")
    try:
        process = subprocess.Popen(
            ["ssh", "-o", "StrictHostKeyChecking=no", "-R", "80:localhost:8005", "nokey@localhost.run"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        for line in iter(process.stdout.readline, ''):
            if "tunneled with tls termination" in line:
                url = re.search(r'https://[a-zA-Z0-9.-]+\.lhr\.life', line)
                if url:
                    print("\n" + "="*70)
                    print(f"🌍 GLOBAL SECURE INTERNET URL: {url.group(0)}")
                    print("📱 Send this exact link to ANY device, ANYWHERE, to connect instantly!")
                    print("="*70 + "\n")
    except Exception as e:
        print(f"Failed to start tunnel: {e}")

if __name__ == "__main__":
    # Start a thread to open the web browser automatically for the Windows user
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Start the global tunnel thread
    threading.Thread(target=start_tunnel, daemon=True).start()
    
    # Run the FastAPI server
    uvicorn.run("server:app", host="0.0.0.0", port=8005, log_level="info")

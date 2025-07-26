📈 StockXpert: Advanced Stock Analysis
Track, Analyze, and Visualize Indian Stock Market Smarter
<div align="center">
<img src="YOUR_IMAGE_LINK_HERE" alt="StockXpert Dashboard Preview" width="800"/>
</div>

<p align="center">
<em>A powerful, full-stack dashboard to analyze Indian stocks using interactive charts, indicators, technical tools, and real-time news.</em>
</p>

About StockXpert
StockXpert is a dynamic and comprehensive web application meticulously crafted for in-depth analysis of Indian stocks. It provides a robust suite of tools including interactive charts with technical indicators, comprehensive company details, a personalized portfolio tracker, a smart stock discovery feature, and real-time news updates. Built with a powerful FastAPI backend and a responsive modern frontend, StockXpert ensures reliable data through yfinance and direct NSE scraping, enhanced with caching for optimal performance and speed.


Features ✨
📊 Interactive Charts – Candlestick, Line & Area charts powered by Plotly.js.

✍️ Technical Drawing Tools – Draw trendlines & support/resistance lines directly on charts.

📈 Built-in Indicators – Simple Moving Averages (SMA) & MACD visualization.

💼 Portfolio Manager – Track your stocks persistently across sessions.

📰 Live News Feed – Real-time news for selected stocks scraped dynamically.

💡 Smart Suggestions – Discover companies in the same sector for comparative insights.

🇮🇳 NSE-Optimized – Designed for Indian stocks using yFinance & NSE scraping.

📱 Responsive UI – Fully mobile-friendly with a modern interface.

Tech Stack 🛠️
<p align="center">
<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Badge"/>
<img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI Badge"/>
<img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python Badge"/>
<img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS Badge"/>
<img src="https://img.shields.io/badge/Plotly.js-3F4F75?style=for-the-badge&logo=plotly&logoColor=white" alt="Plotly.js Badge"/>
</p>


Installation 🚀
Follow these steps to set up and run the StockXpert backend on your local machine.

Prerequisites
Python 3.8+

Node.js v16+ and npm

Backend Setup (FastAPI)
Clone the Repository

git clone https://github.com/shashrwatshukla/StockXpert.git
cd StockXpert

Set Up Backend (FastAPI)

# Create and activate a virtual environment
python -m venv venv

# On Windows
.\venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

Running the Application 🧪
cd api
uvicorn api.index:app --reload --port 8000

Runs at → http://127.0.0.1:8000

Contributing 🤝
We ❤️ contributions! Thanks to everyone who helped shape this project.

👤 Contributor
@ishashwatthakur – Core developer, designer & project maintainer 🎯

To contribute:

# Fork the repo
git checkout -b feature/YourFeature

# Make your changes
git commit -m "Add: Your Feature"

# Push and create a Pull Request
git push origin feature/YourFeature

Disclaimer ⚠️
StockXpert is a learning project and should not be used for real-time financial decisions.
Data may be delayed or inaccurate. Always consult a certified financial advisor before making investments.

<p align="center">
🚀 Built with passion for the Indian stock market 📉🇮🇳
</p>

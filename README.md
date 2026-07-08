# 🧮 CalcPro

> **A modern full-stack calculator application built with Flask and deployed on AWS Cloud using S3, CloudFront, Elastic Beanstalk, and RDS PostgreSQL.**

[![AWS](https://img.shields.io/badge/AWS-Cloud-orange?logo=amazonaws)](https://aws.amazon.com/)
[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-Backend-black?logo=flask)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue?logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🌐 Live Demo

**Frontend:** https://d3677ds3xxb428.cloudfront.net/

---

# 📖 Overview

CalcPro is a cloud-native full-stack calculator application built using **Flask** and deployed entirely on **AWS Cloud**.

The frontend is hosted on **Amazon S3** and delivered globally using **Amazon CloudFront**, while the backend runs on **AWS Elastic Beanstalk** with **PostgreSQL** hosted on **Amazon RDS**.

This project demonstrates a production-ready deployment architecture following cloud best practices.

---

# ✨ Features

- Responsive calculator interface
- Fast arithmetic calculations
- RESTful Flask API
- PostgreSQL database integration
- Global CDN using CloudFront
- Secure HTTPS deployment
- Production-ready AWS infrastructure
- Scalable backend deployment
- Environment variable configuration
- Clean and maintainable project structure

---

# 🏗️ Architecture

```text
                    +----------------------+
                    |      Web Browser     |
                    +----------+-----------+
                               |
                           HTTPS Request
                               |
                               ▼
                    Amazon CloudFront CDN
                               |
                +--------------+--------------+
                |                             |
                ▼                             ▼
         Amazon S3                     Elastic Beanstalk
     (Frontend Hosting)                (Flask Backend)
                                              |
                                              ▼
                                   Amazon RDS PostgreSQL
```

---

# ☁️ AWS Services Used

| Service | Purpose |
|----------|---------|
| Amazon S3 | Frontend Hosting |
| Amazon CloudFront | Global CDN & HTTPS |
| AWS Elastic Beanstalk | Flask Backend Deployment |
| Amazon RDS PostgreSQL | Database |
| AWS IAM | Secure Access Management |

---

# 🛠️ Tech Stack

## Frontend

- HTML5
- CSS3
- JavaScript

## Backend

- Python 3.12
- Flask
- Gunicorn

## Database

- PostgreSQL

## Cloud

- Amazon S3
- Amazon CloudFront
- AWS Elastic Beanstalk
- Amazon RDS
- AWS IAM

---

# 📂 Project Structure

```text
CalcPro/
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── Procfile
│   ├── routes/
│   ├── models/
│   └── utils/
│
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
│
├── docker-compose.yml
├── README.md
└── LICENSE
```

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone https://github.com/<your-github-username>/calcpro.git

cd calcpro
```

---

## Backend Setup

Create a virtual environment.

```bash
python -m venv venv
```

Activate it.

### Linux / macOS

```bash
source venv/bin/activate
```

### Windows

```bash
venv\Scripts\activate
```

Install dependencies.

```bash
pip install -r requirements.txt
```

Run the Flask application.

```bash
python app.py
```

---

# 🐳 Docker

Run the application using Docker Compose.

```bash
docker compose up --build
```

---

# 🔐 Environment Variables

Create a `.env` file.

```env
FLASK_ENV=production

SECRET_KEY=your_secret_key

DATABASE_URL=postgresql://username:password@hostname:5432/database

CORS_ORIGINS=https://d3677ds3xxb428.cloudfront.net
```

---

# 📈 Deployment

The application is deployed using AWS services.

| Component | Service |
|-----------|----------|
| Frontend | Amazon S3 |
| CDN | Amazon CloudFront |
| Backend | AWS Elastic Beanstalk |
| Database | Amazon RDS PostgreSQL |

Deployment flow:

```text
Developer
      │
      ▼
 GitHub Repository
      │
      ▼
Elastic Beanstalk
      │
      ▼
 Flask Backend
      │
      ▼
Amazon RDS PostgreSQL

Frontend
      │
      ▼
 Amazon S3
      │
      ▼
CloudFront CDN
      │
      ▼
 Users
```

---

# 🔒 Security

- HTTPS enabled through CloudFront
- Environment variables for secrets
- Secure PostgreSQL connection
- IAM-based AWS permissions
- Production Flask configuration
- CORS protection

---

# 📸 Live Application

🌐 **https://d3677ds3xxb428.cloudfront.net/**

---

# 📚 Future Improvements

- Calculator history
- Authentication
- User profiles
- Dark mode
- Calculation analytics
- Export history
- Progressive Web App (PWA)
- Unit converter
- Scientific calculator mode

---

# 👨‍💻 Author

**Manoj Krishna M**

B.Tech Artificial Intelligence & Data Science

Cloud Computing • Python • Flask • AWS • PostgreSQL

---

## ⭐ If you like this project

Give this repository a ⭐ on GitHub if you found it useful!

---

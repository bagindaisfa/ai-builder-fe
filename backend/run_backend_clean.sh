#!/bin/bash
rm -rf venv
python3 -m venv venv
source venv/bin/activate # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
python run.py
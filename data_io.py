import csv
import json
import os

def load_csv(file_path):
    """Loads social network data from a CSV file (source, target, weight, platform)."""
    edges = []
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"CSV file not found: {file_path}")
    
    with open(file_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            edge_data = {
                'source': row['source'],
                'target': row['target'],
                'weight': float(row.get('weight', 1.0)),
                'platform': row.get('platform', 'Unknown')
            }
            edges.append(edge_data)
    return edges

def load_json(file_path):
    """Loads social network data from a JSON file (list of dicts with source, target)."""
    edges = []
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"JSON file not found: {file_path}")

    with open(file_path, mode='r', encoding='utf-8') as f:
        data = json.load(f)
        for item in data:
            edges.append((item['source'], item['target']))
    return edges

def get_manual_input():
    """Collects social network data from manual user input."""
    edges = []
    print("Enter edges (source, target). Type 'done' to finish:")
    while True:
        entry = input("Edge (e.g., Alice,Bob): ").strip()
        if entry.lower() == 'done':
            break
        try:
            source, target = entry.split(',')
            edges.append((source.strip(), target.strip()))
        except ValueError:
            print("Invalid format. Please use 'source,target'.")
    return edges

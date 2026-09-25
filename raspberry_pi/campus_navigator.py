#!/usr/bin/env python3
"""
Campus Connect - Dijkstra Shortest Path Navigation Engine
Calculates optimal route and translates path into robot motion commands.
"""

import json
import heapq
import math

class CampusNavigator:
    def __init__(self, routes_file='routes.json'):
        self.routes_file = routes_file
        self.nodes = {}
        self.graph = {}
        self.edges_info = {}
        self.load_map()

    def load_map(self):
        with open(self.routes_file, 'r') as f:
            data = json.load(f)

        self.campus_name = data.get('campus_name', 'Campus')
        for node in data.get('nodes', []):
            self.nodes[node['id']] = node
            self.graph[node['id']] = {}

        for edge in data.get('edges', []):
            u = edge['from']
            v = edge['to']
            dist = edge['distance_meters']
            heading = edge.get('heading_degrees', 0)
            duration = edge.get('drive_time_seconds', 4.0)

            if u in self.graph:
                self.graph[u][v] = dist
                self.edges_info[(u, v)] = {
                    'heading': heading,
                    'distance': dist,
                    'duration': duration
                }

    def dijkstra(self, start_id, target_id):
        """Finds shortest path using Dijkstra's Algorithm."""
        if start_id not in self.nodes or target_id not in self.nodes:
            return None, float('inf')

        distances = {node: float('inf') for node in self.nodes}
        distances[start_id] = 0
        previous = {node: None for node in self.nodes}
        pq = [(0, start_id)]

        while pq:
            curr_dist, curr_node = heapq.heappop(pq)

            if curr_node == target_id:
                break

            if curr_dist > distances[curr_node]:
                continue

            for neighbor, weight in self.graph[curr_node].items():
                distance = curr_dist + weight
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    previous[neighbor] = curr_node
                    heapq.heappush(pq, (distance, neighbor))

        # Reconstruct path
        path = []
        curr = target_id
        while curr:
            path.append(curr)
            curr = previous[curr]
        path.reverse()

        if path and path[0] == start_id:
            return path, distances[target_id]
        return None, float('inf')

    def generate_turn_by_turn(self, path, initial_heading=0):
        """
        Translates node path into robot motion actions.
        Commands:
          - 'STRAIGHT' (Drive forward)
          - 'TURN_90_LEFT' (Arduino '1')
          - 'TURN_90_RIGHT' (Arduino '2')
          - 'TURN_180_LEFT' (Arduino '3')
          - 'TURN_180_RIGHT' (Arduino '4')
        """
        if not path or len(path) < 2:
            return []

        steps = []
        current_heading = initial_heading

        for i in range(len(path) - 1):
            u = path[i]
            v = path[i + 1]
            edge = self.edges_info.get((u, v), {'heading': 0, 'distance': 10, 'duration': 4.0})
            target_heading = edge['heading']

            # Calculate shortest relative turn angle (-180 to +180)
            angle_diff = (target_heading - current_heading + 180) % 360 - 180

            turn_action = None
            arduino_cmd = None

            if abs(angle_diff) < 30:
                turn_action = "CONTINUE STRAIGHT"
                arduino_cmd = None
            elif 60 <= angle_diff <= 120:
                # Right Turn (Clockwise +90°)
                turn_action = "TURN 90° RIGHT"
                arduino_cmd = '2'
            elif -120 <= angle_diff <= -60:
                # Left Turn (Counter-Clockwise -90°)
                turn_action = "TURN 90° LEFT"
                arduino_cmd = '1'
            elif abs(angle_diff) >= 150:
                # U-Turn 180°
                turn_action = "TURN 180° (U-TURN)"
                arduino_cmd = '3'

            from_name = self.nodes[u]['name']
            to_name = self.nodes[v]['name']

            step_data = {
                'step_num': i + 1,
                'from_node': u,
                'from_name': from_name,
                'to_node': v,
                'to_name': to_name,
                'turn_action': turn_action,
                'turn_cmd': arduino_cmd,
                'drive_duration': edge['duration'],
                'distance_meters': edge['distance'],
                'target_heading': target_heading
            }
            steps.append(step_data)
            current_heading = target_heading

        return steps

if __name__ == '__main__':
    nav = CampusNavigator('routes.json')
    path, dist = nav.dijkstra("MAIN_GATE", "TECH_LABS")
    print(f"Shortest Path: {' -> '.join(path)} (Distance: {dist}m)")
    steps = nav.generate_turn_by_turn(path, initial_heading=0)
    for s in steps:
        print(f"Step {s['step_num']}: {s['turn_action']} -> Drive to {s['to_name']} ({s['distance_meters']}m)")

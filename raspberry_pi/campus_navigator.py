#!/usr/bin/env python3
"""
Campus Connect - Dijkstra Shortest Path Navigation Engine
Supports direct forward and reverse/backward motion without unnecessary 180° turns.
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
            duration = edge.get('drive_time_seconds', 3.0)

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
        When moving backwards on a return path (180° difference), it moves BACKWARD directly without turning!
        """
        if not path or len(path) < 2:
            return []

        steps = []
        current_heading = initial_heading

        for i in range(len(path) - 1):
            u = path[i]
            v = path[i + 1]
            edge = self.edges_info.get((u, v), {'heading': 0, 'distance': 5, 'duration': 3.0})
            target_heading = edge['heading']

            # Shortest relative turn angle (-180 to +180)
            angle_diff = (target_heading - current_heading + 180) % 360 - 180

            turn_action = None
            turn_cmd = None
            drive_cmd = 'W' # Default: Forward
            new_heading = target_heading

            if abs(angle_diff) < 30:
                turn_action = "CONTINUE STRAIGHT"
                turn_cmd = None
                drive_cmd = 'W'
                new_heading = target_heading
            elif 60 <= angle_diff <= 120:
                turn_action = "TURN 90° RIGHT"
                turn_cmd = '2'
                drive_cmd = 'W'
                new_heading = target_heading
            elif -120 <= angle_diff <= -60:
                turn_action = "TURN 90° LEFT"
                turn_cmd = '1'
                drive_cmd = 'W'
                new_heading = target_heading
            elif abs(angle_diff) >= 150:
                # Opposite return path -> Reverse directly without 180° rotation!
                turn_action = "REVERSE / BACKWARD (No 180° Turn)"
                turn_cmd = None
                drive_cmd = 'S' # Drive Backward
                new_heading = current_heading # Heading stays same since bot didn't rotate

            from_name = self.nodes[u]['name']
            to_name = self.nodes[v]['name']

            step_data = {
                'step_num': i + 1,
                'from_node': u,
                'from_name': from_name,
                'to_node': v,
                'to_name': to_name,
                'turn_action': turn_action,
                'turn_cmd': turn_cmd,
                'drive_cmd': drive_cmd,
                'drive_duration': edge['duration'],
                'distance_meters': edge['distance'],
                'target_heading': new_heading
            }
            steps.append(step_data)
            current_heading = new_heading

        return steps

if __name__ == '__main__':
    nav = CampusNavigator('routes.json')
    path, dist = nav.dijkstra("S", "A")
    print(f"Path S->A: {path}")
    steps = nav.generate_turn_by_turn(path, initial_heading=270)
    for s in steps:
        print(f"  {s['turn_action']} -> DriveCmd: {s['drive_cmd']} -> {s['to_name']}")

    path_ret, _ = nav.dijkstra("A", "S")
    print(f"\nReturn Path A->S: {path_ret}")
    steps_ret = nav.generate_turn_by_turn(path_ret, initial_heading=270)
    for s in steps_ret:
        print(f"  {s['turn_action']} -> DriveCmd: {s['drive_cmd']} -> {s['to_name']}")

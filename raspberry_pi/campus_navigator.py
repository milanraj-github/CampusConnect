#!/usr/bin/env python3
"""
Campus Connect - Graph & Moves Navigation Engine with Dynamic Rerouting
Supports dynamic Dijkstra path calculation with blocked edge / obstacle avoidance.
"""

import json
import heapq

# Mapping turn commands to Arduino single-character codes
TURN_CMD_MAP = {
    ("L", 45): "5",
    ("R", 45): "6",
    ("L", 90): "1",
    ("R", 90): "2",
    ("L", 135): "7",
    ("R", 135): "8",
    ("L", 180): "3",
    ("R", 180): "4",
}

class CampusNavigator:
    def __init__(self, routes_file='routes.json', base_drive_time=2.5):
        self.routes_file = routes_file
        self.base_drive_time = base_drive_time
        self.graph = {}
        self.moves = {}
        self.nodes = {}
        self.load_map()

    def load_map(self):
        with open(self.routes_file, 'r') as f:
            data = json.load(f)

        self.graph = data.get('graph', {})
        self.moves = data.get('moves', {})
        
        for k in self.graph.keys():
            self.nodes[k] = {"id": k, "name": f"Point {k}" if k != "S" else "Base Station (S)"}

    def dijkstra(self, start_id, target_id, blocked_edges=None):
        """
        Calculates shortest path using Dijkstra, avoiding any temporarily blocked edges.
        blocked_edges is a set of tuples: e.g. {('S', 'A'), ('A', 'S')}
        """
        if start_id not in self.graph or target_id not in self.graph:
            return None, float('inf')

        if start_id == target_id:
            return [start_id], 0

        if blocked_edges is None:
            blocked_edges = set()

        distances = {node: float('inf') for node in self.graph}
        distances[start_id] = 0
        previous = {node: None for node in self.graph}
        pq = [(0, start_id)]

        while pq:
            curr_dist, curr_node = heapq.heappop(pq)

            if curr_node == target_id:
                break

            if curr_dist > distances[curr_node]:
                continue

            for neighbor, weight in self.graph[curr_node].items():
                # Skip blocked obstacle paths
                if (curr_node, neighbor) in blocked_edges or (neighbor, curr_node) in blocked_edges:
                    continue

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

    def get_motion_commands_for_path(self, path):
        if not path or len(path) < 2:
            return []

        all_steps = []
        for i in range(len(path) - 1):
            u = path[i]
            v = path[i + 1]
            key = f"{u}-{v}"
            move_info = self.moves.get(key)

            if not move_info:
                print(f"[WARN] No move entry found for '{key}' in routes.json!")
                continue

            commands = move_info.get('commands', [])

            for cmd_pair in commands:
                action_type = cmd_pair[0] # 'L', 'R', 'F', 'B'
                val = cmd_pair[1]

                if action_type in ['L', 'R']:
                    arduino_code = TURN_CMD_MAP.get((action_type, int(val)))
                    all_steps.append({
                        'type': 'TURN',
                        'action': f"Turn {val}° {'LEFT' if action_type == 'L' else 'RIGHT'}",
                        'arduino_cmd': arduino_code,
                        'leg': key,
                        'from_node': u,
                        'to_node': v
                    })
                elif action_type == 'F':
                    drive_secs = float(val) * self.base_drive_time
                    all_steps.append({
                        'type': 'DRIVE',
                        'action': f"Drive Forward ({val} units / {drive_secs:.1f}s)",
                        'arduino_cmd': 'W',
                        'duration': drive_secs,
                        'leg': key,
                        'from_node': u,
                        'to_node': v
                    })
                elif action_type == 'B':
                    drive_secs = float(val) * self.base_drive_time
                    all_steps.append({
                        'type': 'DRIVE',
                        'action': f"Drive Backward ({val} units / {drive_secs:.1f}s)",
                        'arduino_cmd': 'S',
                        'duration': drive_secs,
                        'leg': key,
                        'from_node': u,
                        'to_node': v
                    })

        return all_steps

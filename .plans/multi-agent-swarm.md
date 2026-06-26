# Multi-Agent Swarm Implementation Plan

## Goal

Implement a multi-agent swarm system with layered subagents that can coordinate, delegate, and execute complex tasks autonomously.

## Current State

The repository has a basic OpenAgents infrastructure with:

- **Core agents**: openagent, opencoder, repo-manager, system-builder
- **Subagents**: task-manager, batch-executor, coder-agent, tester, reviewer, etc.
- **Skills**: context7, task-management
- **Context files**: Standards, conventions, workflows

**Missing**: Swarm coordination, state management, inter-agent communication, failure recovery.

## Architecture

### Layer 0: Swarm Coordinator (NEW)

```
SwarmCoordinator
├── Orchestrates subagent teams
├── Manages shared state
├── Routes messages between agents
└── Handles failure recovery
```

### Layer 1: Specialized Teams (NEW)

```
AuthTeam
├── auth-planner          # Plans auth implementation
├── auth-coder            # Implements auth code
├── auth-security-reviewer # Reviews for vulnerabilities
└── auth-test-engineer    # Tests auth flows

FrontendTeam
├── frontend-planner
├── frontend-coder
├── frontend-ui-specialist
└── frontend-tester

BackendTeam
├── backend-planner
├── backend-coder
├── backend-devops
└── backend-tester
```

### Layer 2: Existing Infrastructure (LEVERAGE)

```
openagent/opencoder     # Primary coordination
task-manager            # Task breakdown
batch-executor          # Parallel task execution
coder-agent             # Code implementation
tester                  # Testing
reviewer                # Code review
```

## Communication Protocol

### Message Format

```json
{
  "type": "task.request",
  "from": "swarm-coordinator",
  "to": "auth-team",
  "taskId": "auth-001",
  "payload": {
    "action": "implement",
    "feature": "passkey-auth",
    "constraints": ["security", "dual-hosting"]
  },
  "timestamp": "2026-01-11T10:00:00Z"
}
```

### Shared State Structure

```
.opencode/swarm/
├── state.json           # Global swarm state
├── tasks/               # Task queue
├── agents/              # Agent registry
├── messages/            # Inter-agent messages
└── results/             # Completed work
```

## Implementation Tasks

### Phase 1: Swarm Infrastructure

- [ ] Create `.opencode/swarm/state.json` schema
- [ ] Create `swarm-coordinator.md` agent definition
- [ ] Create `.opencode/agent/swarm-coordinator/` directory
- [ ] Implement message routing system
- [ ] Add state persistence layer

### Phase 2: Team Definitions

- [ ] Create AuthTeam subagents (planner, coder, security-reviewer, tester)
- [ ] Create FrontendTeam subagents
- [ ] Create BackendTeam subagents
- [ ] Define team handoff protocols
- [ ] Add team membership registry

### Phase 3: Coordination Logic

- [ ] Implement task delegation from coordinator to teams
- [ ] Add progress tracking across teams
- [ ] Implement cross-team dependency resolution
- [ ] Add failure detection and recovery
- [ ] Create swarm status dashboard

### Phase 4: Integration

- [ ] Integrate with existing task-manager skill
- [ ] Add swarm commands to `.opencode/command/`
- [ ] Create swarm initialization script
- [ ] Add logging and monitoring
- [ ] Document swarm usage patterns

## Agent Definitions

### Swarm Coordinator

```yaml
id: swarm-coordinator
name: SwarmCoordinator
category: subagents/swarm
type: subagent
version: 1.0.0
tags: [orchestration, coordination, swarm]
capabilities:
  - Coordinate multiple specialized teams
  - Manage shared state and message passing
  - Handle task routing and delegation
  - Monitor progress and detect failures
dependencies:
  - subagent:task-manager
  - subagent:batch-executor
  - context:swarm-protocol
  - context:state-management
```

### Specialized Subagents

Each team member follows pattern:

```yaml
id: auth-planner
name: AuthPlanner
category: subagents/swarm/auth-team
type: subagent
version: 1.0.0
tags: [planning, auth, security]
focus: auth-implementation-planning
```

## State Management

### State Schema

```json
{
  "swarmId": "uuid",
  "status": "active|paused|completed|failed",
  "teams": {
    "auth": { "status": "planning", "progress": 0.25 },
    "frontend": { "status": "waiting", "progress": 0 }
  },
  "tasks": [{ "id": "auth-001", "status": "in-progress", "agent": "auth-planner" }],
  "messages": []
}
```

## Failure Modes & Recovery

| Failure               | Detection            | Recovery                       |
| --------------------- | -------------------- | ------------------------------ |
| Agent unresponsive    | Timeout > 5 min      | Redistribute tasks             |
| State corruption      | Checksum mismatch    | Restore from backup            |
| Team deadlock         | No progress > 10 min | Coordinator intervention       |
| Communication failure | Message queue error  | Retry with exponential backoff |

## Security Considerations

1. **Agent isolation**: Each agent runs with minimal permissions
2. **State encryption**: Sensitive data encrypted at rest
3. **Message integrity**: HMAC signatures on inter-agent messages
4. **Access control**: Only authorized agents can modify state

## Validation Plan

- [ ] Swarm coordinator can spawn and manage teams
- [ ] Teams can complete tasks in parallel
- [ ] State persists across agent restarts
- [ ] Failure recovery works correctly
- [ ] Existing agents still function standalone

## Open Questions

1. ~~Should swarm state be stored in `.tmp/swarm/` or `.opencode/swarm/`?~~ **Answered**: `.opencode/swarm/`
2. ~~How should agents discover each other - static config or dynamic registry?~~ **Answered**: Hybrid - static top-level teams, dynamic sub-teams
3. ~~Should teams be allowed to spawn sub-teams dynamically?~~ **Answered**: Hybrid - Fixed top-level teams with dynamic sub-teams allowed internally
4. ~~What's the maximum recommended team size before overhead exceeds benefits?~~ **Answered**: 4-6 agents per team

## Exit Criteria

- [ ] SwarmCoordinator can orchestrate a test task
- [ ] At least 2 specialized teams implemented
- [ ] State management works reliably
- [ ] Documentation complete for agent creation
- [ ] State stored in `.opencode/swarm/`

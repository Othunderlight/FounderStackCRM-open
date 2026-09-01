# AGENTS.md - Frontend Developer Guide

## Project Context

This is a React + TypeScript + Tailwind CRM application with a Notion-style dark mode interface. The project already has basic kanban board components but they need significant UX improvements to match Notion's polished drag-and-drop experience.

## Current Kanban Components

- `components/KanbanBoard.tsx` - Opportunity kanban (Screening → Meeting → Proposal → Customer)
- `components/TaskKanban.tsx` - Task kanban (Todo → In Progress → Done)

## Problem

The current kanban boards work functionally but have poor UX:
- No visual feedback when dragging over columns
- No drop zone highlighting
- No drag preview/ghost cards
- No smooth animations
- Cards don't elevate or scale during drag
- No subtle column highlighting when hovering
- Poor drag-and-drop "feel"

## Goal

Transform the kanban to match **Notion's kanban UX** which features:
- Smooth, responsive drag-and-drop with proper visual feedback
- Cards elevate and show a "ghost" preview while dragging
- Columns highlight when hovering with a dragged card
- Fluid animations throughout the drag lifecycle
- Subtle drop zone indicators
- Clean, minimal visual design with refined spacing
- Professional feel that makes users confident about dropping

## Implementation Requirements

### Tech Stack
- React 19 with TypeScript
- Tailwind CSS v4
- Zustand for state management
- Use `@dnd-kit/core` and `@dnd-kit/sortable` for drag-and-drop (install if needed)
- Motion library or CSS animations for transitions

### UX Specifications

1. **Drag Preview**: When dragging a card, show a scaled/elevated preview with enhanced shadow
2. **Drop Zone Feedback**: Highlight the target column with a subtle border or background color when hovering with a dragged card
3. **Ghost Card**: Show a semi-transparent placeholder where the card will land
4. **Smooth Animations**: All transitions should use easing (ease-out, ~200-300ms)
5. **Card Elevation**: Cards should rise (translate-y, shadow increase) during drag
6. **Column Highlight**: Target column shows subtle highlight (e.g., `border-accent` or `bg-accent/5`)
7. **Cursor Changes**: Proper cursor states (grab → grabbing)

### File Changes

Update these files with Notion-style UX:
- `components/KanbanBoard.tsx` - Opportunity kanban
- `components/TaskKanban.tsx` - Task kanban

### Design Direction

Following the `frontned-design-skill.md`, create a **refined, minimal aesthetic**:
- Dark theme (#191919 background)
- Subtle borders and shadows
- Clean typography with good hierarchy
- Generous but efficient spacing
- Smooth micro-interactions
- Professional, production-grade polish

### Code Guidelines

- Use `clsx` and `tailwind-merge` for conditional classes
- Keep existing functionality (selection, context menu, etc.)
- Maintain existing data fetching and mutations
- Use Zustand store for state management

## Running the Project

```bash
cd frontend
npm run dev
```

## Dependencies

If `@dnd-kit` packages are needed, install:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## important RULES
- never run any npm or vite command
- never run tsc commands
- always give the user a short meaningfull commit msg they can commit after the changes you worked on

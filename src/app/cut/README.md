# Cut Planner Component

Optimize element placement on a sheet with layout calculation.

## Features

- **Sheet Size Control**: Set width/height in mm (min: 1mm)
- **Element Management**: Add, remove, resize elements
- **Element Types**: Panel, Door, Leg, Shelf, Accessory
- **Optimization**: Backend API calculates optimal positions
- **Visualization**: SVG rendering of placements
- **Export**: Download results as PNG
- **Error Handling**: User-friendly error messages

## Files

```
src/app/cut/
├── cut.component.ts           # Component logic
├── cut.component.html         # Template
├── cut.component.scss         # Styles
├── cut.component.spec.ts      # Unit tests
├── cut.service.ts             # HTTP service
└── cut.service.spec.ts        # Service tests

features/component/
├── cut.feature                # BDD tests
└── cut.steps.ts               # Step definitions

furniture-e2e-tests/
├── features/e2e/cut.feature   # E2E scenarios
└── tests/cut.spec.js          # E2E tests
```

## Component Methods

### Management

```typescript
addElement()                    // Add new element with auto ID
removeElement(index)            // Remove element at index
incSheet(key)                   // Increase sheet width/height by 1mm
decSheet(key)                   // Decrease sheet width/height (min: 1mm)
incEl(index, 'width'|'height') // Increase element size by 1mm
decEl(index, 'width'|'height') // Decrease element size (min: 1mm)
```

### Data

```typescript
buildPayload()                  // Build request payload
optimize()                      // Send optimization request
getTypeIcon(type)               // Get Material icon for type
exportPng()                     // Export SVG as PNG
```

## Service API

**Endpoint**: `POST http://localhost:8081/furniture/cut`

**Request**:
```json
{
  "sheetWidth": 2000,
  "sheetHeight": 1000,
  "elements": [
    {"id": 1, "width": 500, "height": 300},
    {"id": 2, "width": 400, "height": 200}
  ]
}
```

**Response**:
```json
{
  "placements": [
    {"id": 1, "x": 0, "y": 0, "width": 500, "height": 300},
    {"id": 2, "x": 500, "y": 0, "width": 400, "height": 200}
  ]
}
```

## Running Tests

### Unit Tests
```bash
npm test -- --include='**/cut.component.spec.ts'
npm test -- --include='**/cut.service.spec.ts'
```

### BDD Tests
```bash
TS_NODE_PROJECT=tsconfig.cucumber.json npx cucumber-js features/component/cut.feature
```

### E2E Tests
```bash
cd furniture-e2e-tests
npm test
```

## Quick Start

```bash
# Development
npm start
# Open http://localhost:4200/cut
```

## Properties

```typescript
form: FormGroup              // Reactive form
elements: FormArray          // Element list
placements: Placement[]      // Optimization results
loading: boolean             // Loading state
errorMsg: string | null      // Error message
```

## Validation Rules

- Sheet dimensions: min 1mm
- Element dimensions: min 1mm
- Optimize requires: valid form + at least 1 element

## Element Types & Icons

| Type | Icon | Color |
|------|------|-------|
| panel | crop_square | grey |
| door | door_front | blue |
| leg | construction | green |
| shelf | auto_awesome_mosaic | yellow |
| accessory | extension | purple |

## Stack

- Angular 16+ (Standalone)
- Reactive Forms
- Material Design
- RxJS
- TypeScript
- Jasmine/Karma
- Cucumber
- Selenium WebDriver

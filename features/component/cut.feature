Feature: CutComponent behaviours

  Background:
    Given a fresh CutComponent with mocked services

  Scenario: SVG visualization displays sheet dimensions correctly
    Given the sheet width is 2000 and height is 1000
    Then the SVG sheet width should be 2000
    And the SVG sheet height should be 1000

  Scenario: SVG visualization maps placements to parts with correct colors
    Given the sheet width is 2000 and height is 1000
    And an element with id 1, type "door", width 200, height 100 exists
    And an element with id 2, type "leg", width 50, height 50 exists
    And placements exist with element 1 at position (10, 20) size 200x100
    And placements exist with element 2 at position (30, 40) size 50x50
    When I get the parts for visualization
    Then there should be 2 parts
    And part 1 should have id 1, position (10, 20), size 200x100, and color "#90caf9"
    And part 2 should have id 2, position (30, 40), size 50x50, and color "#a5d6a7"

  Scenario: SVG visualization uses default color for missing element types
    Given the sheet width is 2000 and height is 1000
    And placements exist with element 999 at position (0, 0) size 100x50
    When I get the parts for visualization
    Then part 1 should have color "#b0bec5"

  Scenario: PNG export does not export when no placements exist
    Given the sheet width is 2000 and height is 1000
    And no placements exist
    When I attempt to export PNG
    Then PNG export should not be triggered

  Scenario: PNG export does not export when SVG element is not available
    Given the sheet width is 2000 and height is 1000
    And placements exist with element 1 at position (0, 0) size 100x50
    And the SVG element is not available
    When I attempt to export PNG
    Then PNG export should not be triggered

  Scenario: PNG export successfully exports when placements and SVG are available
    Given the sheet width is 2000 and height is 1000
    And placements exist with element 1 at position (0, 0) size 100x50
    And the SVG element is available with viewBox 2000x1000
    When I attempt to export PNG
    Then PNG export should be triggered
    And the SVG should be serialized
    And a PNG blob should be created
    And a download link should be created with filename "cut-layout.png"

  Scenario: Adding elements assigns defaults and ids
    When I add 2 new elements
    Then there should be 2 form elements
    And form element 1 should have id 1, type "panel", width 100, height 50
    And form element 2 should have id 2, type "panel", width 100, height 50

  Scenario: Removing an element drops it from the form
    When I add 2 new elements
    And I remove the form element at index 0
    Then there should be 1 form elements
    And form element 1 should have id 2, type "panel", width 100, height 50

  Scenario: Optimize sends payload when form is valid
    Given the sheet width is 1200 and height is 600
    And an element with id 5, type "panel", width 200, height 100 exists
    And the optimize response has placements for element 5 at (0, 0) size 200x100
    When I optimize the layout
    Then the service should be called once
    And the last optimize payload should have sheet 1200x600 and 1 element with id 5 width 200 height 100
    And the component placements should have 1 item with id 5 at (0, 0) size 200x100

  Scenario: Optimize skips when the form is invalid
    Given the sheet width is 0 and height is 600
    When I optimize the layout
    Then the service should not be called

  Scenario: Optimize error is captured and placements cleared
    Given the sheet width is 800 and height is 400
    And an element with id 1, type "panel", width 100, height 50 exists
    And the optimize call will fail with message "boom"
    When I optimize the layout
    Then the component should show error "boom"
    And the component placements should be empty


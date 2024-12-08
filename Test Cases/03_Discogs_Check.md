# Test Cases for Discogs Link Behavior in VinylJourney

## Introduction

This document outlines the test cases for verifying that links to Discogs open in a new tab or window from the VinylJourney application.

## Test Cases

### Test Case 1: Discogs Link from Home Page

- **Test Case ID**: TC-007
- **Objective**: Verify that clicking a Discogs link from the Home Page opens the link in a new tab or window.
- **Preconditions**: The server is running, and the Home Page is loaded with album details.
- **Test Steps**:
  1. Open a web browser.
  2. Navigate to `http://localhost:3333`.
  3. Locate an album with a Discogs link.
  4. Click on the Discogs link.
- **Expected Result**: The Discogs link should open in a new tab or window.
- **Actual Result**: [To be filled after execution]
- **Status**: [Pass/Fail]

### Test Case 2: Discogs Link from Random Album Page

- **Test Case ID**: TC-008
- **Objective**: Verify that clicking a Discogs link from the Random Album Page opens the link in a new tab or window.
- **Preconditions**: The server is running, and the Random Album Page is loaded with album details.
- **Test Steps**:
  1. Open a web browser.
  2. Navigate to `http://localhost:3333/random`.
  3. Locate an album with a Discogs link.
  4. Click on the Discogs link.
- **Expected Result**: The Discogs link should open in a new tab or window.
- **Actual Result**: [To be filled after execution]
- **Status**: [Pass/Fail]

## Notes

- Ensure that the target attribute of the link is set to `_blank` to open in a new tab or window.
- Record any discrepancies or issues in the "Actual Result" section.
- Update the "Status" field based on the outcome of each test case.

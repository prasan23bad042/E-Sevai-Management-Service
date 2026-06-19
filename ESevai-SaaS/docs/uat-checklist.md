# E-Sevai SaaS - User Acceptance Testing (UAT) Checklist

This document details the UAT test checklist workflows to verify that the E-Sevai SaaS platform functions correctly under real-world operational scenarios.

---

## Scenario 1: Create Citizen Application (Staff Role)

* **Role**: `staff`
* **Prerequisites**: Staff user is logged in, and at least one service exists in the catalog.

| Step | Action | Expected Behavior | Pass / Fail |
| :---: | :--- | :--- | :---: |
| 1 | Click "New Application" from the dashboard sidebar. | Page opens displaying the services catalog options grid. | [ ] |
| 2 | Select "Income Certificate" service. | App transitions to the draft form wizard; required checklist items load. | [ ] |
| 3 | Input citizen details (Name, Aadhaar, Phone). Enter an invalid phone number format. | Inline validation displays error: "Phone number format is invalid". | [ ] |
| 4 | Correct phone details and click "Save as Draft". | Application is successfully created in `draft` state; application number is generated. | [ ] |

---

## Scenario 2: Upload Documents (Staff Role)

* **Role**: `staff`
* **Prerequisites**: Application created in Scenario 1 is active.

| Step | Action | Expected Behavior | Pass / Fail |
| :---: | :--- | :--- | :---: |
| 1 | Navigate to application details; locate the "Documents Checklist" section. | Checklist renders placeholder buttons for Aadhaar Card, Photo, and PAN. | [ ] |
| 2 | Drag and drop a `.exe` file into the Aadhaar slot. | UI rejects the upload immediately; displays "File format not supported". | [ ] |
| 3 | Drag and drop a valid `aadhaar.pdf` (size < 5MB). | Upload completes successfully; status changes to `uploaded`. | [ ] |
| 4 | Refresh the browser page. | Document remains uploaded and preview button becomes active. | [ ] |

---

## Scenario 3: Verify Documents (Manager Role)

* **Role**: `manager`
* **Prerequisites**: Application documents are uploaded from Scenario 2.

| Step | Action | Expected Behavior | Pass / Fail |
| :---: | :--- | :--- | :---: |
| 1 | Log in as Manager; open the "Documents Awaiting Review" dashboard queue. | Application is listed in the review queue grid. | [ ] |
| 2 | Select the application; click "Preview Document" next to Aadhaar. | Document viewer displays the PDF file inline on screen. | [ ] |
| 3 | Click "Reject Document" and enter comment: "Document blurry". | Status updates to `rejected`; notification alerts the submitting staff member. | [ ] |
| 4 | Re-upload valid file as staff; manager reviews and clicks "Verify Document". | Status updates to `verified`; application transitions to `pending_payment`. | [ ] |

---

## Scenario 4: Receive Payment & Generate Receipt (Staff Role)

* **Role**: `staff`
* **Prerequisites**: Application is in `pending_payment` status.

| Step | Action | Expected Behavior | Pass / Fail |
| :---: | :--- | :--- | :---: |
| 1 | Click "Collect Payment" on the application page. | Billing dialog displays breakdown: ₹100 Govt Fee + ₹50 Service Fee = ₹150 Total. | [ ] |
| 2 | Select "Cash" payment method. Input: Cash Received = ₹200. | System calculates and displays balance: ₹50. | [ ] |
| 3 | Click "Submit Payment Collection". | Database transaction updates application status to `submitted`. | [ ] |
| 4 | Click "Download Receipt". | A print-ready receipt downloads containing the tracking code and center info. | [ ] |

---

## Scenario 5: Download Revenue Reports (Center Owner Role)

* **Role**: `center_owner`
* **Prerequisites**: Payments recorded under Scenario 4.

| Step | Action | Expected Behavior | Pass / Fail |
| :---: | :--- | :--- | :---: |
| 1 | Log in as Center Owner; click "Reports" on sidebar navigation. | Revenue metrics graphs and filters list loads. | [ ] |
| 2 | Set Date Range filter to "Current Month" and format to "CSV". | Filter submits and updates metrics summary. | [ ] |
| 3 | Click "Export Data". | Excel-compatible CSV file downloads, formatting special characters correctly via UTF-8 BOM. | [ ] |

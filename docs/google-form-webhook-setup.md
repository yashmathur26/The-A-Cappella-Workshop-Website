# Google Form → Website Webhook (Easy Setup)

Parents fill out **only** the Google Form. When they submit, your site gets their name and email and auto-fills checkout. **No "Registration ID" field, no entry IDs** — we match by the parent’s email.

---

## What parents do

1. Add weeks to cart → click **Registration Form**.
2. Enter the **same email** they’ll use in the form in the cart (right side). They can do this before or after filling the form.
3. Fill out and submit the Google Form.
4. Within a few seconds the site shows “Form Received!” and fills in their info; they click **Proceed to Checkout**.

---

## What you do (one-time)

### 1. Add the script to your Google Form

1. Open your form (e.g. Lexington) → **Extensions** → **Apps Script**.
2. Delete any code in the editor.
3. Copy everything from **`docs/google-form-webhook.gs`** and paste it in.
4. At the top, set **`WEBHOOK_URL`** to your live site:
   ```js
   var WEBHOOK_URL = 'https://theacappellaworkshop.com/api/google-form-submitted';
   ```
5. In **`FIELD_MAP`**, use your **exact** form question titles:
   ```js
   var FIELD_MAP = {
     parentEmail: 'Parent Email',   // your email question title
     childName: "Child's Name",     // your child/student name question title
     parentName: 'Parent Name'     // optional
   };
   ```
6. Save (Ctrl/Cmd+S).

### 2. Run the script when the form is submitted

1. In Apps Script, open **Triggers** (clock icon on the left).
2. **+ Add Trigger**.
3. Set:
   - **Function:** `onFormSubmit`
   - **Event:** From form → **On form submit**
4. Save and approve the permissions when Google asks.

---

## That’s it

- **No new form fields** — your form stays as-is (it just needs an email and name question).
- **No entry IDs** — the script matches by question titles.
- **No site config** — no `formSessionIdEntryId` or similar.

Matching works both ways: if they enter their email on the site first, we link it to their session; when the form is submitted with that email, we attach the response to that session. If they submit the form first, we store the response by email and attach it when they type that same email on the site.

---

## If something doesn’t work

- **“Form Received!” never appears**  
  - Check that the parent used the **same email** in the form and in the cart.  
  - In Apps Script, open **Executions** (left sidebar) and see if `onFormSubmit` ran or threw an error.

- **Webhook errors in Executions**  
  - Confirm `WEBHOOK_URL` is **https** and points to `/api/google-form-submitted`.  
  - Confirm your form question titles match **FIELD_MAP** exactly (including spaces and punctuation).

- **Still stuck**  
  - They can use **“Click here to confirm manually”** under the form and type their info in the cart; checkout will still work.

# Typeform → Website Webhook

Parents fill out your **Typeform**. When they submit, your site gets their parent email, student name, and parent name and auto-fills checkout. We match by the parent’s email (no hidden fields needed).

---

## What parents do

1. Add weeks to cart → click **Registration Form**.
2. Optionally enter the **same email** they’ll use in the form in the cart (so we can match as soon as they submit).
3. Fill out and submit the Typeform.
4. Within a few seconds the site shows “Contact Info Received!” and fills in their info; they click **Proceed to Checkout**.

---

## What you do (one-time)

### 1. Use the right question titles in Typeform

The site looks for these **exact** question titles (or titles that start with them):

| Our field   | Accepted titles (use one)      |
|------------|------------------------------|
| Parent email | `Parent/guardian email:` or `Parent/guardian email` |
| Student name | `Student name:` or `Student name` |
| Parent name  | `Parent/guardian name:` or `Parent/guardian name` |

- **Parent email** is required (we match by it). Use an **Email** question in Typeform.
- **Student name** and **Parent/guardian name** can be Short text questions.

### 2. Add the webhook in Typeform

1. Open your typeform in the Typeform editor.
2. Go to **Connect** (or **Integrations**) → **Webhooks**.
3. **Add a webhook**.
4. Set the webhook URL to:
   ```
   https://theacappellaworkshop.com/api/typeform-webhook
   ```
5. Choose **Full form submissions only** (recommended).
6. Save.

### 3. Set the form URL in the codebase

In `client/src/contexts/LocationContext.tsx`, set **`formUrl`** for the location to your Typeform embed URL, for example:

```ts
formUrl: 'https://form.typeform.com/to/YOUR_FORM_ID',
```

Use the same URL you’d use to embed the form (e.g. from Typeform: Share → Embed).

---

## That’s it

- **No hidden fields** — we match by the parent email from the form.
- **No Apps Script** — Typeform sends the webhook directly to your site.

If they enter their email on the site first, we link it to their session; when the form is submitted with that email, we attach the response. If they submit the form first, we store by email and attach when they type that same email on the site.

---

## If something doesn’t work

- **“Contact Info Received!” never appears**  
  - Parent must use the **same email** in the form and (if they type it) in the cart.  
  - In Typeform, check **Connect** → **Webhooks** and look at recent deliveries / logs.

- **Webhook fails**  
  - Confirm the URL is exactly `https://theacappellaworkshop.com/api/typeform-webhook` (no trailing slash).  
  - Confirm question titles match the table above (e.g. “Parent/guardian email:” with the colon if that’s what you used).

- **Still stuck**  
  - They can use **“Or enter details manually”** and type their info in the cart; checkout will still work.

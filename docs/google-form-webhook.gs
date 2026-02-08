/**
 * Google Apps Script: send form responses to your website so it can
 * auto-fill contact info and unlock checkout. Match by email — no
 * "Registration ID" field needed in the form.
 *
 * SETUP: See docs/google-form-webhook-setup.md
 */

// ============ CONFIG — Update these ============
var WEBHOOK_URL = 'https://theacappellaworkshop.com/api/google-form-submitted';

// Exact question titles from your Lexington form (case-sensitive, include colon if the form has it).
var FIELD_MAP = {
  parentEmail: 'Parent/guardian email:',
  childName: 'Student name:',
  parentName: 'Parent/guardian name:'
};

// ============ Script (no need to edit below) ============

function onFormSubmit(e) {
  if (!e || !e.response) return;
  var response = e.response;
  var itemResponses = response.getItemResponses();
  var payload = {};

  itemResponses.forEach(function (itemResponse) {
    var title = (itemResponse.getItem().getTitle() || '').trim();
    var answer = itemResponse.getResponse();
    if (typeof answer !== 'string') answer = Array.isArray(answer) ? answer.join(', ') : String(answer);

    if (title === FIELD_MAP.parentEmail) {
      payload.parentEmail = answer;
    } else if (title === FIELD_MAP.childName) {
      payload.childName = answer;
    } else if (title === FIELD_MAP.parentName) {
      payload.parentName = answer;
    }
  });

  if (!payload.parentEmail) {
    Logger.log('No parent email in response; webhook not sent.');
    return;
  }

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var result = UrlFetchApp.fetch(WEBHOOK_URL, options);
  if (result.getResponseCode() >= 200 && result.getResponseCode() < 300) {
    Logger.log('Webhook sent for email: ' + payload.parentEmail);
  } else {
    Logger.log('Webhook failed: ' + result.getResponseCode() + ' ' + result.getContentText());
  }
}

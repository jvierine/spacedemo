const feedbackTrigger = document.createElement('button');
feedbackTrigger.className = 'feedback-trigger';
feedbackTrigger.type = 'button';
feedbackTrigger.textContent = 'Feedback';
feedbackTrigger.setAttribute('aria-haspopup', 'dialog');

const feedbackDialog = document.createElement('dialog');
feedbackDialog.className = 'feedback-dialog';
feedbackDialog.innerHTML = `
  <form method="dialog" class="feedback-form">
    <div class="feedback-heading">
      <div><small>Help shape the next version</small><h2>Feedback and demo ideas</h2></div>
      <button class="feedback-close" value="cancel" aria-label="Close feedback form">×</button>
    </div>
    <label>Type
      <select name="kind">
        <option value="improvement">Improve this demonstration</option>
        <option value="new_demo">Suggest a new demonstration</option>
      </select>
    </label>
    <label>Your suggestion
      <textarea name="message" minlength="10" maxlength="2000" rows="6" required placeholder="What should be clearer, changed, or demonstrated next?"></textarea>
    </label>
    <label>Class password
      <input name="password" type="password" required autocomplete="off" spellcheck="false">
    </label>
    <label class="feedback-honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
    <p class="feedback-privacy">Stored with this page’s address. No name, email, or IP address is requested.</p>
    <p class="feedback-status" role="status" aria-live="polite"></p>
    <button class="feedback-submit accent" type="submit" value="submit">Send suggestion</button>
  </form>`;

document.body.append(feedbackTrigger, feedbackDialog);
const feedbackForm = feedbackDialog.querySelector('form');
const feedbackStatus = feedbackDialog.querySelector('.feedback-status');
const feedbackSubmit = feedbackDialog.querySelector('.feedback-submit');

feedbackTrigger.addEventListener('click', () => {
  feedbackStatus.textContent = '';
  if (typeof feedbackDialog.showModal === 'function') feedbackDialog.showModal();
  else feedbackDialog.setAttribute('open', '');
  feedbackDialog.querySelector('textarea').focus();
});

feedbackForm.addEventListener('submit', async event => {
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  if (!feedbackForm.reportValidity()) return;
  feedbackSubmit.disabled = true;
  feedbackStatus.textContent = 'Sending…';
  const fields = new FormData(feedbackForm);
  try {
    const response = await fetch('/space/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        kind: fields.get('kind'),
        message: fields.get('message'),
        password: fields.get('password'),
        website: fields.get('website'),
        page: location.pathname
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || 'Submission failed');
    feedbackForm.reset();
    feedbackStatus.textContent = 'Thank you — the suggestion was saved.';
    setTimeout(() => feedbackDialog.close(), 1200);
  } catch (error) {
    feedbackStatus.textContent = `Could not save feedback: ${error.message}`;
  } finally {
    feedbackSubmit.disabled = false;
  }
});

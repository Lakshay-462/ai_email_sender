const el = id => document.getElementById(id);

async function checkAuth() {
  try {
    const r = await fetch('/auth/status', { credentials: 'include' });
    const j = await r.json();
    if (j.authenticated) {
      el('authStatus').innerHTML = '<strong>Signed in with Google</strong>';
      el('logoutBtn').style.display = 'inline-block';
    } else {
      el('authStatus').innerHTML = 'Not signed in. <a href="/auth/google">Sign in with Google</a>';
      el('logoutBtn').style.display = 'none';
    }
  } catch (e) {
    el('authStatus').textContent = 'Auth check failed';
  }
}
checkAuth();

el('logoutBtn').onclick = async () => {
  await fetch('/logout', { method: 'POST', credentials: 'include' });
  window.location.href = '/login.html';
};

el('generateBtn').onclick = async () => {
  el('status').textContent = 'Generating…';
  const prompt = el('prompt').value + "\n\nPlease output a short subject line on a separate 'Subject:' line, then a blank line, then the email body.";
  try {
    const r = await fetch('/generate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ prompt })
    });
    const j = await r.json();
    const text = j.email || j.error || JSON.stringify(j);
    const m = text.match(/Subject:\s*(.*)\n\n([\s\S]*)/i);
    if (m) { el('subject').value = m[1].trim(); el('emailBody').value = m[2].trim(); }
    else { el('emailBody').value = text; }
    el('status').textContent = 'Generated';
  } catch (err) {
    el('status').textContent = 'Generation error: ' + err.message;
  }
};

el('sendBtn').onclick = async () => {
  const recipients = el('recipients').value.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
  if (!recipients.length) return alert('Add recipient emails');
  const subject = el('subject').value;
  const body = el('emailBody').value.replace(/\n/g, '<br/>');

  el('status').textContent = 'Sending…';
  try {
    const r = await fetch('/send-email', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      credentials: 'include',
      body: JSON.stringify({ recipients, subject, body })
    });
    const j = await r.json();
    if (j.ok) {
      el('status').textContent = 'Sent successfully';
      alert('Email sent! Check your Sent folder in Gmail.');
    } else {
      el('status').textContent = 'Send failed: ' + (j.error || JSON.stringify(j));
      alert('Send failed: ' + (j.error || JSON.stringify(j)));
    }
  } catch (err) {
    el('status').textContent = 'Send error: ' + err.message;
  }
};

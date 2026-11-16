// The welcome email every new member receives automatically after their payment completes.
const { esc, brandedEmail } = require('./email');
const { APP_URL } = require('./newsletter-email');

const MISSION = 'Christ Ones United connects followers of Christ through business networking and referrals, turning relationships into opportunities for discipleship, ministry, and Kingdom impact.';
const SUBJECT = "Welcome to Christ One's United";

const MEMBER_STEPS = [
  ['Find businesses', 'Browse the directory, or type a ZIP code or tap "Use my current location" to see Christian-owned businesses near you, or near where you are traveling.'],
  ['Save your favorites', 'Tap the heart on any listing to save it, so the businesses you trust are easy to find again.'],
  ['Refer and testify', 'Tap Refer to send a friend to a business, and Testify to share how a business served you. Your word is the best introduction.'],
  ['Message a business', 'Tap Message to ask a question or request a service directly from the business owner.'],
  ['Stay connected', 'Check Events and Jobs for what is happening in your community, and read the weekly edition for news and a prayer highlight.'],
];
const BUSINESS_STEPS = [
  ['Complete your listing', 'Go to Listing to add your description, ZIP code, service area and church, and upload your logo. New listings are reviewed before they appear in the directory.'],
  ['Answer messages quickly', 'Open Messages to reply to members who reach out. A fast, friendly answer builds trust.'],
  ['Track your referrals', 'The Referrals tab shows people who were sent to your business, so you can follow up and thank those who sent them.'],
  ['Post jobs and events', 'Use Jobs to find help for your team and Community to post events you are hosting.'],
  ['Collect testimonials', 'Ask happy customers to Testify on your listing. Their words show up on your card and on your dashboard.'],
];

function steps(list) {
  return list.map((s, i) =>
    '<tr><td valign="top" style="width:26px;padding:0 10px 10px 0;font-family:Georgia,serif;font-size:16px;color:#c9973a;">' + (i + 1) + '.</td>' +
    '<td style="padding:0 0 10px 0;font-size:14px;line-height:1.55;"><strong style="color:#1a1a2e;">' + esc(s[0]) + '.</strong> ' + esc(s[1]) + '</td></tr>').join('');
}
const label = t => '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:bold;color:#8a6a1f;margin:0 0 8px 0;">' + t + '</div>';

// type: 'business' puts the business guide first; anything else puts the member guide first
function renderWelcome({ name, type }) {
  const first = String(name || '').trim().split(/\s+/)[0];
  const isBiz = type === 'business';
  const memberBlock = '<div style="margin:0 0 18px 0;">' + label('Using the app as a member') + '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' + steps(MEMBER_STEPS) + '</table></div>';
  const bizBlock = '<div style="margin:0 0 18px 0;">' + label('Growing your business here') + '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' + steps(BUSINESS_STEPS) + '</table></div>';

  let body =
    '<p style="margin:0 0 14px 0;">' + (first ? 'Hello ' + esc(first) + ',' : 'Hello,') + '</p>' +
    '<p style="margin:0 0 18px 0;">Welcome, and thank you for joining. We are grateful you are here. Christ One&#8217;s United was built for followers of Christ who want to do business, serve and encourage one another as the body of Christ. Your membership is already helping this community grow, and we are honored to walk with you.</p>' +
    '<div style="background:#fdf6e7;border-left:3px solid #c9973a;border-radius:10px;padding:14px 16px;margin:0 0 20px 0;">' + label('Our Mission') +
      '<div style="font-family:Georgia,serif;font-size:15px;line-height:1.55;font-style:italic;color:#1a1a2e;">' + esc(MISSION) + '</div></div>' +
    '<h2 style="margin:0 0 12px 0;font-family:Georgia,serif;font-size:18px;font-weight:normal;color:#1a1a2e;">How to get the most from the app</h2>' +
    (isBiz ? bizBlock + memberBlock : memberBlock + bizBlock) +
    '<div style="background:#e8f3ee;border-radius:10px;padding:14px 16px;margin:0 0 20px 0;">' + label('<span style="color:#1a6b4a;">Help us grow, one family at a time</span>') +
      '<p style="margin:0 0 8px 0;font-size:14px;line-height:1.55;">This community grows the way the church always has: person to person. We are building it from the ground up, and we invite you to be part of it.</p>' +
      '<p style="margin:0;font-size:14px;line-height:1.55;">Share Christ One&#8217;s United with your family, your church, your small group and the Christian business owners you know and trust. Every friend you invite adds another connection, another opportunity and another chance to encourage someone. Just send them <a href="' + APP_URL + '" style="color:#1a6b4a;font-weight:bold;">app.christonesunited.com</a>.</p></div>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:6px auto 18px auto;"><tr><td style="background:#c9973a;border-radius:8px;">' +
      '<a href="' + APP_URL + '" style="display:inline-block;padding:12px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1a1a2e;text-decoration:none;">Open Christ One&#8217;s United</a></td></tr></table>' +
    '<p style="margin:0 0 14px 0;font-size:14px;color:#4d4a42;">Need help? Tap the <strong>Support</strong> button in the app, or simply reply to this email.</p>' +
    '<p style="margin:0;font-size:13px;font-style:italic;color:#6b6558;text-align:center;">&ldquo;For where two or three gather in my name, there am I with them.&rdquo; &mdash; Matthew 18:20</p>';

  const footer = '<div style="margin-top:12px;font-size:11px;color:#9a9080;">Please add our email address to your contacts, and check your spam or junk folder if our messages do not arrive.<br/>' +
    'Christ One&#8217;s United LLC &middot; PO Box 90, Pine, CO 80470</div>';
  return brandedEmail({ title: 'Welcome' + (first ? ', ' + first : '') + '!', bodyHtml: body, footerHtml: footer });
}

module.exports = { renderWelcome, SUBJECT, MISSION };

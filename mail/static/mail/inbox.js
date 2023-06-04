document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email(email = null) {
  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

  // Pre-fill composition fields if email is provided
  if (email && email.sender) {
    document.querySelector('#compose-recipients').value = email.sender;
    document.querySelector('#compose-subject').value = email.subject.startsWith('Re: ')
      ? email.subject
      : 'Re: ' + email.subject;
    document.querySelector('#compose-body').value =
      `On ${formatTimestamp(email.timestamp)}, ${email.sender} wrote:\n${email.body}`;
  } else {
    document.querySelector('#compose-recipients').value = '';
  }

  // Add event listener to compose form submission
  document.querySelector('#compose-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the default form submission

    // Get the values from the compose form fields
    let recipients = document.querySelector('#compose-recipients').value.trim(); // Trim leading/trailing spaces
    const subject = document.querySelector('#compose-subject').value;
    const body = document.querySelector('#compose-body').value;

    // Make sure at least one recipient is provided
    if (recipients.length === 0) {
      console.error('Error: Please provide at least one recipient');
      return; // Stop further execution
    }

    // Make a POST request to send the email
    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
        recipients: recipients,
        subject: subject,
        body: body
      })
    })
      .then(response => response.json())
      .then(result => {
        // Check the result of the email sending
        if (result.error) {
          console.error('Error sending email:', result.error);
        } else {
          console.log('Email sent successfully');
          load_mailbox('sent'); // Load the 'sent' mailbox after successful sending
        }
      })
      .catch(error => console.error('Error sending email:', error));
  });
}


function load_mailbox(mailbox) {
  const emailsView = document.querySelector('#emails-view');

  // Show the mailbox and hide other views
  emailsView.style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Clear the emails view
  emailsView.innerHTML = '';

  // Show the mailbox name
  const mailboxHeader = document.createElement('h3');
  mailboxHeader.textContent = mailbox.charAt(0).toUpperCase() + mailbox.slice(1);
  emailsView.appendChild(mailboxHeader);

  // Make GET request to retrieve emails from the selected mailbox
  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
      // Iterate over the emails and display them
      emails.forEach(email => {
        const emailDiv = document.createElement('div');
        emailDiv.classList.add('email');

        // Set the background color based on read/unread status
        emailDiv.style.backgroundColor = email.read ? 'white' : 'lightgray';

        // Add border and padding to the email block
        emailDiv.style.border = '1px solid #ccc';
        emailDiv.style.padding = '10px';
        emailDiv.style.marginBottom = '10px';

        // Create the email sender element
        const senderDiv = document.createElement('div');
        senderDiv.classList.add('email-sender');
        senderDiv.textContent = 'From: ' + email.sender;
        emailDiv.appendChild(senderDiv);

        // Create the email details container
        const detailsDiv = document.createElement('div');
        detailsDiv.classList.add('email-details');

        // Create the email subject element
        const subjectDiv = document.createElement('div');
        subjectDiv.classList.add('email-subject');
        subjectDiv.textContent = 'Subject: ' + email.subject;
        detailsDiv.appendChild(subjectDiv);

        // Create the email timestamp element
        const timestampDiv = document.createElement('div');
        timestampDiv.classList.add('email-timestamp');
        timestampDiv.textContent = 'Timestamp: ' + formatTimestamp(email.timestamp);
        detailsDiv.appendChild(timestampDiv);

        // Add the email details container to the email block
        emailDiv.appendChild(detailsDiv);

        // Add archive/unarchive button based on the mailbox
        if (mailbox === 'inbox') {
          const archiveButton = document.createElement('button');
          archiveButton.classList.add('btn', 'btn-sm', 'btn-outline-primary',  'mt-2');
          archiveButton.textContent = 'Archive';
          archiveButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent the click event from propagating to the email div
            archive_email(email.id);
          });
          emailDiv.appendChild(archiveButton);
        } else if (mailbox === 'archive') {
          const unarchiveButton = document.createElement('button');
          unarchiveButton.classList.add('btn', 'btn-sm', 'btn-outline-primary', 'mt-2');
          unarchiveButton.textContent = 'Unarchive';
          unarchiveButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent the click event from propagating to the email div
            unarchive_email(email.id);
          });
          emailDiv.appendChild(unarchiveButton);
        }

        // Add click event listener to view email details
        emailDiv.addEventListener('click', () => view_email(email.id, mailbox));

        // Append the email block to the emails view
        emailsView.appendChild(emailDiv);
      });
    });
}


function view_email(email_id, mailbox) {
  // Hide emails view and compose view
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Make GET request to retrieve the selected email
  fetch(`/emails/${email_id}`)
    .then(response => response.json())
    .then(email => {
      // Show email view
      document.querySelector('#email-view').style.display = 'block';

      // Set the background color to indicate read status
      if (!email.read) {
        // Mark email as read
        fetch(`/emails/${email_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            read: true
          })
        })
          .then(() => console.log('Email marked as read'))
          .catch(error => console.error('Error marking email as read:', error));
      }

      // Clear the email view
      document.querySelector('#email-view').innerHTML = '';

      // Create the email details container
      const detailsDiv = document.createElement('div');
      detailsDiv.classList.add('email-details');

      // Create the email sender element
      const senderDiv = document.createElement('div');
      senderDiv.classList.add('email-sender');
      senderDiv.textContent = 'From: ' + email.sender;
      detailsDiv.appendChild(senderDiv);

      // Create the email recipients element
      const recipientsDiv = document.createElement('div');
      recipientsDiv.classList.add('email-recipients');
      recipientsDiv.textContent = 'To: ' + email.recipients.join(', ');
      detailsDiv.appendChild(recipientsDiv);

      // Create the email subject element
      const subjectDiv = document.createElement('div');
      subjectDiv.classList.add('email-subject');
      subjectDiv.textContent = 'Subject: ' + email.subject;
      detailsDiv.appendChild(subjectDiv);

      // Create the email timestamp element
      const timestampDiv = document.createElement('div');
      timestampDiv.classList.add('email-timestamp');
      timestampDiv.textContent = 'Timestamp: ' + formatTimestamp(email.timestamp);
      detailsDiv.appendChild(timestampDiv);

      // Add the email details container to the email view
      document.querySelector('#email-view').appendChild(detailsDiv);

      // Create the email body element
      const bodyDiv = document.createElement('div');
      bodyDiv.classList.add('email-body');
      bodyDiv.textContent = email.body;
      document.querySelector('#email-view').appendChild(bodyDiv);

      // Create the reply button
      const buttonContainer = document.createElement('div');
      buttonContainer.classList.add('d-flex', 'justify-content-between');

      const replyButton = document.createElement('button');
      replyButton.classList.add('btn', 'btn-sm', 'btn-outline-primary', 'mt-3');
      replyButton.textContent = 'Reply';

      const backButton = document.createElement('button', 'mt-3');
      backButton.classList.add('btn', 'btn-sm', 'btn-secondary');
      backButton.textContent = 'Back to Mailbox';

      replyButton.addEventListener('click', () => compose_email(email));
      backButton.addEventListener('click', () => load_mailbox(mailbox));

      buttonContainer.appendChild(replyButton);
      buttonContainer.appendChild(backButton);

      document.querySelector('#email-view').appendChild(buttonContainer);
    });
}



function archive_email(email_id) {
  // Send PUT request to archive the email
  fetch(`/emails/${email_id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: true
    })
  })
    .then(() => {
      console.log('Email archived successfully');
      load_mailbox('inbox'); // Reload the 'inbox' mailbox after archiving
    })
    .catch(error => console.error('Error archiving email:', error));
}

function unarchive_email(email_id) {
  // Send PUT request to unarchive the email
  fetch(`/emails/${email_id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: false
    })
  })
    .then(() => {
      console.log('Email unarchived successfully');
      load_mailbox('archive'); // Reload the 'archive' mailbox after unarchiving
    })
    .catch(error => console.error('Error unarchiving email:', error));
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
} 
// ENVIRONMENT VARIABLES
require('dotenv').config();

const fetch = require("node-fetch");
const http = require('http')
const createHandler = require('github-webhook-handler')
const octokit = require("@octokit/rest")()
const handler = createHandler({ path: '/', secret: 'myhashsecret' })

// Allow octokit to act as our account
octokit.authenticate({
  type: "token",
  token: process.env.GITHUB_TOKEN,
})

const port = process.env.PORT || 3000;

http.createServer(function (req, res) {
  handler(req, res, function (err) {
    res.statusCode = 404
    res.end('no such location')
  })
}).listen(port)
console.log(`Corriendo en puerto ${port}`);

handler.on('ping', async function (event) {
  const { ping_url } = event.payload.hook;
  console.log(event);
  await fetch(ping_url, parseBody());
  return response('Ping exitoso');
})

handler.on('error', function (err) {
  console.error('Error:', err.message)
})

handler.on('issue_comment', async function (event) {

  // Extract a few useful things from the payload
  const { payload } = event;
  const labels = payload.issue.labels;
  const issueNumber = payload.issue.number;
  const repoName = payload.repository.name;
  const repoOwner = payload.repository.owner.login;
  const commentAuthor = payload.comment.user.login;
  const commentBody = payload.comment.body;

  // If it's not a /request comment
  if (!commentBody.includes('/request')) {
    return respond("No hay nada que hacer aqui.");
  }

  // If it's already assigned, inform the user and do nothing.
  const isAssigned = labels.find(({ name }) => name === "asignado");
  if (isAssigned) {
    await octokit.issues.createComment({
      repo: repoName,
      owner: repoOwner,
      number: issueNumber,
      body: `Lo siento @${commentAuthor}, este desafío está asignado a alguien mas.`,
    });

    return respond("El desafio ya tiene a alguien asignado.");
  }

  // Else apply new labels and inform the user
  await Promise.all([
    octokit.issues.replaceAllLabels({
      repo: repoName,
      owner: repoOwner,
      number: issueNumber,
      labels: ["asignado", `asignado:${commentAuthor}`],
    }),
    octokit.issues.createComment({
      repo: repoName,
      owner: repoOwner,
      number: issueNumber,
      body: `Hey @${commentAuthor}, el desafio es todo tuyo.`,
    }),
  ]);
  
})

/**
 * Generate a response
 * @param {any} payload 
 * @param {number?} statusCode 
 */
function respond(payload, statusCode = 200) {
  return {
    statusCode,
    body: JSON.stringify({ payload })
  };
}

function parseBody(body) {
  const parsed = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    mode: 'cors',
    cache: 'default',
  };
  if (body) {
    parsed.body = JSON.stringify(body);
  }
  return parsed;
}

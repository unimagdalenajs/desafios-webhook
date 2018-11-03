// ENVIRONMENT VARIABLES
require('dotenv').config();

var http = require('http')
var createHandler = require('github-webhook-handler')
const octokit = require("@octokit/rest")()
var handler = createHandler({ path: '/', secret: 'myhashsecret' })

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

handler.on('*', async function (event) {
  const { ping_url } = event.payload.hook;
  console.log(event);
  await fetch(new Request(ping_url, headers()));
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

function headers() {
  return {
    method: 'POST',
    headers: new Headers(),
    mode: 'cors',
    cache: 'default'
  };
}
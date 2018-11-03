const { makeBody, respond } = require('./utils');
const createHandler = require('github-webhook-handler');
const fetch = require("node-fetch");
const octokit = require("@octokit/rest")();

// Allow octokit to act as our account
octokit.authenticate({
  type: "token",
  token: process.env.GITHUB_TOKEN,
});

module.exports = function (req, res, errorCallback) {
  const handler = createHandler({ path: '/', secret: 'myhashsecret' });

  handler.on('error', function (err) {
    console.error('Error:', err.message);
  });

  handler.on('ping', async function (event) {
    const { ping_url } = event.payload.hook;
    await fetch(ping_url, makeBody());
    return respond('Ping exitoso');
  });

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
    
  });

  handler(req, res, errorCallback);

};

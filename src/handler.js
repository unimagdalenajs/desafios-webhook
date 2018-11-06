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

  // handler.on('*', function (event) {
  //   console.log('EVENT PAYLOAD:', event.payload);
  // });

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
    const pull_request = payload.issue.pull_request;

    if (pull_request) {
      if (commentBody.includes('/merge')) {
        const issueIds = commentBody.match(/#\d+/g) || [];
        if (Array.isArray(issueIds) && issueIds.length === 2) {
          const [fixed, created] = issueIds;

          await Promise.all([
            // close fixed issue
            octokit.issues.edit({
              repo: repoName,
              owner: repoOwner,
              number: fixed,
              state: 'closed',
              labels: [],
            }),
            // make created issue as available
            octokit.issues.replaceAllLabels({
              repo: repoName,
              owner: repoOwner,
              number: created,
              labels: ["disponible"],
            }),
            // A comment in the PR
            octokit.issues.createComment({
              repo: repoName,
              owner: repoOwner,
              number: issueNumber,
              body: `Genial @${commentAuthor}! Acabas de superar el desafio.
              Espero hayas aprendido algo valioso y que hayas disfrutado hacer el reto, recuerda que la práctica hace al Maestro.
              Felicidades!!!`,
            }),
          ]);
        }
      }
      return respond("No hay nada que hacer aqui.");
    }

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

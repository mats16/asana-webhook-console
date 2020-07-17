/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/




const express = require('express');
const bodyParser = require('body-parser');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const request = require('request-promise-native');
const asana = require('asana');

// declare a new express app
const app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
});

app.post('/proxy', function(req, res) {
  const x_hook_signature = req.headers['x-hook-signature']
  const x_hook_secret = req.headers['x-hook-secret']
  if (typeof x_hook_secret === "undefined") {
    const targetUrl = req.query['target'];
    const personalAccessToken = req.query['pat'];
    const client = asana.Client.create().useAccessToken(personalAccessToken);

    const asanaEventNotify = async (element) => {
      const event = element
      let content = '';
      if (event.resource.resource_type == 'story' && event.parent.resource_type == 'task') {
        const user = await client.users.getUser(event.user.gid);
        user.alias = user.email.split('@')[0];

        const taskGid = event.parent.gid;
        const task = await client.tasks.getTask(taskGid);
        if (task.name == '') { task.notes = 'TBD' }
        if (task.notes == '') { task.notes = 'TBD' }
        task.nameWithUrl = `[**${task.name}**](https://app.asana.com/0/${task.projects[0].gid}/${taskGid})`

        if (task.assignee) {
          const assignee = await client.users.getUser(task.assignee.gid);
          task.assignee.alias = assignee.email.split('@')[0];
        } else {
          task.assignee = { alias: 'TBD' }
        }

        const resource_subtype = event.resource.resource_subtype

        if (resource_subtype == 'added_to_project') {
          const msg = `✏️ Task created by ${user.alias}`
          const details = `Assignee: ${task.assignee.alias}\nDue date: ${task.due_on}\nProject: [${task.projects[0].name}](https://app.asana.com/0/${task.projects[0].gid}/list)\nDescription: ${task.notes}`
          content = `/md\n${msg}\n${task.nameWithUrl}\n\n---\n${details}`
        } else if (resource_subtype == 'assigned') {
          const msg = `👤 Task assigned by ${user.alias}`
          const details = `Assignee: @${task.assignee.alias}\nDue date: ${task.due_on}\nProject: [${task.projects[0].name}](https://app.asana.com/0/${task.projects[0].gid}/list)\nDescription: ${task.notes}`
          content = `/md\n${msg}\n${task.nameWithUrl}\n\n---\n${details}`
        } else if (resource_subtype == 'due_date_changed') {
          const msg = `⏳ Due date changed by ${user.alias}`
          const details = `Assignee: ${task.assignee.alias}\nDue date: ${task.due_on}\nProject: [${task.projects[0].name}](https://app.asana.com/0/${task.projects[0].gid}/list)\nDescription: ${task.notes}`
          content = `/md\n${msg}\n${task.nameWithUrl}\n\n---\n${details}`
        } else if (resource_subtype == 'comment_added') {
          const storyGid = event.resource.gid;
          const story = await client.stories.getStory(storyGid);
          console.log(JSON.stringify(story, null, '\t'))

          let comment = story.text
          const regexp = new RegExp(/https:\/\/app\.asana\.com\/0\/\d{16}\/list/g);
          const result = comment.match(regexp);
          //if (result) {
          //  for (let url of result) {
          //    const userGid = url.match(/\d{16}/g)[0];
          //    client.users.getUser(userGid)
          //      .then((result) => {
          //        comment = comment.replace(url, `@${result.email}`)
          //      })
          //  }
          //}
          const msg = `💬 Comment added by ${user.alias}`
          content = `/md\n${msg}\n${task.nameWithUrl}\n\n---\n${comment}`
        }
      }
      if (content != '') {
        const params = {
          method: 'POST',
          uri: targetUrl,
          json: { Content: content }
        };
        return await request(params);
      } else {
        return
      }
    }

    const events = req.body.events;
    console.log(JSON.stringify(events, null, '\t'));
    Promise.all(events.map(asanaEventNotify))
      .finally(() => {
        res.header('X-Hook-Signature', x_hook_signature);
        res.status(200);
        res.json({});
      });
  } else {
    // Handshake
    res.header('X-Hook-Secret', x_hook_secret);
    res.status(200);
    res.json({});
  }
});

app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app

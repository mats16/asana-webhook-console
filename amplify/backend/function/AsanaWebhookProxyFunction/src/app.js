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
  //console.log(req)
  const x_hook_secret = req.headers['x-hook-secret']
  if (typeof x_hook_secret === "undefined") {
    const targetUrl = req.query['target'];
    const personalAccessToken = req.query['pat'];
    const client = asana.Client.create().useAccessToken(personalAccessToken);

    const asanaEventNotify = async (element) => {
      const event = element
      let content = '';
      if (event.resource.resource_type === 'task' && event.parent.resource_type === 'project') {
        const userGid = event.user.gid;
        const taskGid = event.resource.gid;
        const user = await client.users.getUser(userGid);
        const task = await client.tasks.getTask(taskGid);
        const taskName = (task.name === '') ? 'Task Name: TBD' : task.name;
        const taskDescription = (task.notes === '') ? 'TBD' : task.notes;

        if (event.action === 'added') {
          content = `/md\n✏️ Task created by @${user.email}\n[**${taskName}**](https://app.asana.com/0/${task.projects[0].gid}/${taskGid})\n\n---\nProject: [${task.projects[0].name}](https://app.asana.com/0/${task.projects[0].gid}/list)\nDescription: ${taskDescription}`
        }

      } else if (event.resource.resource_type === 'story' && event.parent.resource_type === 'task') {
        const userGid = event.user.gid;
        const storyGid = event.resource.gid;
        const taskGid = event.parent.gid;
        const user = await client.users.getUser(userGid);
        const story = await client.stories.getStory(storyGid);
        const task = await client.tasks.getTask(taskGid);

        //if (event.resource.resource_subtype === 'added_to_project') {
        //  content = `/md\nTask created by @${user.email}\n### [${task.name}](https://app.asana.com/0/${task.projects[0].gid}/${taskGid})\n    ${task.notes}`
        //}
        if (event.resource.resource_subtype === 'comment_added') {
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
          content = `/md\n💬 Comment added by @${user.name}\n[**${task.name}**](https://app.asana.com/0/${task.projects[0].gid}/${taskGid})\n\n---\n${comment}`
        }
      }
      if (content !== '') {
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
        res.status(200);
        res.json({});
      });

    //(async () => {
    //  for await (let event of events) {
    //    if (event.resource.resource_type === 'task' && event.action === 'added' && event.parent.resource_type === 'project') {
    //      const taskGid = event.resource.gid;
    //      client.tasks.getTask(taskGid)
    //        .then((result) => {
    //          console.log(result);
    //          // Chime Post
    //          const params = {
    //            method: 'POST',
    //            uri: target,
    //            json: { Content: JSON.stringify(result, null, '\t') }
    //          }
    //          request(params);
    //        })
    //        .catch((err) => {
    //          console.log(err);
    //          res.status(200);
    //          res.json({});
    //        });
    //    } else if (event.resource.resource_type === 'story' && event.resource.resource_subtype === 'comment_added' && event.parent.resource_type === 'task') {
    //      //taskGid = event.parent.gid
    //      const params = {
    //        method: 'POST',
    //        uri: target,
    //        json: { Content: JSON.stringify(event, null, '\t') }
    //      }
    //      request(params);
    //    }
    //  }
    //}).finally(() => {
    //  res.status(200);
    //  res.json({});
    //});

    //const target = req.query['target'];
    //request({
    //  method: 'POST',
    //  uri: target,
    //  json: { Content: JSON.stringify(req.body, null, '\t') }
    //})
    //  .then((result) => {
    //    console.log(result);
    //    res.status(200);
    //    res.json({});
    //  })
    //  .catch((err) => {
    //    console.log(err);
    //    res.status(200);
    //    res.json({});
    //  })
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

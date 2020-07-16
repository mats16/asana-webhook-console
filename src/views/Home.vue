<template>
  <div class="home">
    <el-form label-width="120px">

      <el-form-item label="Access Token">
        <el-input v-model="personalAccessToken" placeholder="Personal Access Token"></el-input>
      </el-form-item>

      <!--<el-form :inline="true" label-width="120px">-->
      <el-form-item label="Workspace">
        <el-col :span="4">
          <el-select v-model="selectedWorkspaceGid" placeholder="Select Workspace">
            <el-option
              v-for="item in workspaces"
              :key="item.gid"
              :label="item.name"
              :value="item.gid">
            </el-option>
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="fetchWorkspaces(personalAccessToken)">Fetch Workspaces</el-button>
        </el-col>
      </el-form-item>
      <!--</el-form>-->

      <el-form-item label="New Webhook">
        <el-form-item>
          <el-col :span="5">
            <el-form-item label="Team" label-width="120px">
              <el-select v-model="selectedTeamGid" placeholder="Select Team">
                <el-option
                  v-for="item in teams"
                  :key="item.gid"
                  :label="item.name"
                  :value="item.gid">
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="5">
            <el-form-item label="Project" label-width="60px">
              <el-select v-model="selectedProjectGid" placeholder="Select Project">
                <el-option
                  v-for="item in projects"
                  :key="item.gid"
                  :label="item.name"
                  :value="item.gid">
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-form-item>

        <el-form-item label="Events" label-width="120px">
          <el-checkbox-group v-model="whitelistEvents">
            <el-checkbox label="create_task">Create Task</el-checkbox>
            <el-checkbox label="comment_added">Add Comment</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="Managed Proxy" label-width="120px">
          <el-switch
            v-model="proxyEnabled"
            active-text="Enabled"
            inactive-text="Disabled">
          </el-switch>
        </el-form-item>

        <el-form-item>
          <el-col :span="10">
            <el-form-item label="Target URL" label-width="120px">
              <el-input v-model="targetUrl"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="1">
            <el-button type="primary" @click="createWebhook(selectedProjectGid, targetUrl, personalAccessToken)">Create New Webhook</el-button>
          </el-col>
        </el-form-item>

      </el-form-item>

    </el-form>

    <el-table
      :data="webhooks"
      stripe
      style="width: 100%">

      <el-table-column
        prop="gid"
        label="gid"
        width="150">
      </el-table-column>

      <el-table-column
        prop="active"
        label="active"
        width="100">
        <template slot-scope="scope">
          {{ scope.row.active ? 'Active' : 'Inactive' }}
        </template>
      </el-table-column>

      <el-table-column label="resource">
        <el-table-column
          prop="resource.gid"
          label="gid"
          width="150">
        </el-table-column>
        <el-table-column
          prop="resource.resource_type"
          label="resource_type"
          width="150">
        </el-table-column>
        <el-table-column
          prop="resource.name"
          label="name">
        </el-table-column>
      </el-table-column>

      <el-table-column
        prop="target"
        label="target">
      </el-table-column>

      <el-table-column
        fixed="right"
        label="operations"
        width="120">
        <template slot-scope="scope">
          <el-button @click="deleteWebhook(scope.row.gid)" type="text" size="small">Delete</el-button>
        </template>
      </el-table-column>

    </el-table>

  </div>
</template>

<script>
// @ is an alias to /src
//import HelloWorld from '@/components/HelloWorld.vue'
import asana from 'asana'
import { API } from 'aws-amplify';

export default {
  name: 'Home',
  data() {
    return {
      personalAccessToken: '',
      selectedWorkspaceGid: '',
      selectedTeamGid: '',
      selectedProjectGid: '',
      whitelistEvents: ['create_task', 'comment_added'],
      proxyEnabled: true,
      targetUrl: '',
      form: {
        //personalAccessToken: '1/1118174269302114:881cfafea20e250289896c4e0787dfd6',
        //workspace: '',
        //team: '',
        //project: '',
        filters: [],
        targetUrl: ''
      },
      workspaces: [],
      teams: [],
      projects: [],
      webhooks: []
    }
  },
  created () {
    if (localStorage.personalAccessToken) {
      const token = localStorage.personalAccessToken;
      this.personalAccessToken = token;
      const client = asana.Client.create().useAccessToken(token);
      client.workspaces.getWorkspaces()
        .then((result) => {
          this.workspaces = result.data;
          if (localStorage.lastSelectedWorkspaceGid) {
            const workspaceGid = localStorage.lastSelectedWorkspaceGid;
            this.selectedWorkspaceGid = workspaceGid;
            this.fetchWebhooks(workspaceGid);
          }
        })
    }
  },
  watch: {
    personalAccessToken(token) {
      localStorage.personalAccessToken = token;
    },
    selectedWorkspaceGid(workspaceGid) {
      localStorage.lastSelectedWorkspaceGid = workspaceGid;
      this.selectedTeamGid = '';
      if (workspaceGid === '') {
        this.teams = [];
        this.webhooks = [];
      } else {
        this.fetchTeams(workspaceGid);
        this.fetchWebhooks(workspaceGid);
      }
    },
    selectedTeamGid(teamGid) {
      this.selectedProjectGid = '';
      if (teamGid === '') {
        this.projects = []
      } else {
        this.fetchProjects(teamGid);
      }
    }
  },
  computed: {
    client: function () {
      const token = this.personalAccessToken;
      const client = asana.Client.create().useAccessToken(token);
      return client
    },
    whitelistFilters: function () {
      const filters = [];
      if (this.whitelistEvents.includes('create_task')) {
        filters.push({
          resource_type: 'task',
          action: 'added'
        })
      }
      if (this.whitelistEvents.includes('comment_added')) {
        filters.push({
          resource_type: 'story',
          resource_subtype: 'comment_added',
          action: 'added'
        })
      }
      return filters
    }
  },
  methods: {
    fetchWorkspaces() {
      this.client.workspaces.getWorkspaces()
        .then((result) => {
          this.workspaces = result.data;
          this.selectedWorkspaceGid = '';
        });
    },
    fetchTeams(workspaceGid) {
      this.client.teams.getTeamsForUser('me', {organization: workspaceGid})
        .then((result) => {
          this.teams = result.data;
        });
    },
    fetchProjects(teamGid) {
      this.client.projects.getProjectsForTeam(teamGid)
        .then((result) => {
          this.projects = result.data;
        });
    },
    fetchWebhooks(workspaceId) {
      this.client.webhooks.getWebhooks({workspace: workspaceId, opt_pretty: true})
        .then((result) => {
          this.webhooks = result.data;
        });
    },
    createWebhook(resourceGid, chimeWebhookUrl, personalAccessToken) {
      const apiEndpoint = API._restApi._options.aws_cloud_logic_custom.find(x => x.name === 'webhook').endpoint
      const targetUrl = (this.proxyEnabled)
        ? `${apiEndpoint}/proxy?target=${chimeWebhookUrl}&pat=${personalAccessToken}`
        : chimeWebhookUrl;
      //const targetUrl = `${apiEndpoint}/proxy?target=${chimeWebhookUrl}&pat=${personalAccessToken}`
      const params = {
        filters: this.whitelistFilters,
        resource: resourceGid,
        target: targetUrl
      }
      this.client.webhooks.createWebhook(params)
        .then((result) => {
            console.log(result);
            this.webhooks.push(result)
        })
        .catch((err) => {
          console.log(err);
        });
    },
    deleteWebhook(webhookGid) {
      this.client.webhooks.deleteWebhook(webhookGid)
        .then(() => {
          const index = this.webhooks.findIndex(x => x.gid === webhookGid);
          this.webhooks.splice(index, 1);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  },
  components: {
    //HelloWorld
  }
}
</script>

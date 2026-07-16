import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any user authenticated via an API key can "create", "read",
"update", and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
  Comment: a.customType({
    author: a.string(),
    content: a.string()
  }),
  Location: a
    .model({
      date: a.date().required(),
      time: a.time(),
      track: a.integer().required(),
      type: a.string(),
      diameter: a.float(),
      length: a.float().required(),
      lat: a.float().required(),
      lng: a.float().required(),
      username: a.string(),
      description: a.string(),
      width: a.float(),
      photos: a.string().array(),
      comments: a.ref('Comment').array(),
      joint: a.string(),
      station: a.string(),
      dateId: a.id(),
      date_record: a.belongsTo('Date', 'dateId'),
      trackId: a.id(),
      track_record: a.belongsTo('Track', 'trackId'),
    })
    .authorization((allow) => [allow.publicApiKey()]),
  Track: a
    .model({
      track: a.integer().required(),
      trackid: a.integer(),
      geometry: a.string().default('line'),
      ft2: a.float(),
      yd2: a.float(),
      unitprice: a.float(),
      totalprice:a.float(),
      quan: a.float(),
      width: a.float(), 
      value: a.float(),
      numpoint: a.integer(),
      trip: a.boolean(),
      cost: a.boolean(),
      unit: a.string(),
      lastdate: a.string(),
      color: a.string(),
      typeid1:a.string(),
      typeid: a.string(),
      type: a.string(),
      locations: a.hasMany('Location', 'trackId'),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  Date: a
    .model({
      date: a.date(),
      weather: a.string(),
      hight: a.float(),
      lowt: a.float(),
      supervisor: a.string(),
      labor: a.integer(),
      observation: a.string(),
      remark: a.string(),
      comment: a.string(),
      equipment: a.string(),
      station: a.string(), 
      feet: a.integer(), 
      locations: a.hasMany('Location', 'dateId'),
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});



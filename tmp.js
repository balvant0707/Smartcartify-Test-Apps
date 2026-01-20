const fetch = require('node-fetch');
(async () => {
  try {
    const res = await fetch('https://testing-m2web.myshopify.com/admin/api/2024-10/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': 'shpua_c628f2ecabd66be0bacbe61d7f414926',
      },
      body: JSON.stringify({ query: '{__type(name:\"DeliveryProfileInput\"){inputFields{name}}}' }),
    });
    console.log('status', res.status, res.statusText);
    console.log(await res.text());
  } catch (err) {
    console.error(err);
  }
})();

import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
console.log("IPv4 DNS priority set.");

# Testing

## Testing From VM
```sh
curl -sk --resolve owi-auth-gateway-dev.wexapi.com:443:10.151.20.10 https://owi-auth-gateway-dev.wexapi.com/health
curl -sk --resolve shared.dev.wexapi.com:443:10.151.20.10 https://shared.dev.wexapi.com/health
curl -sk --resolve onboarding.dev.wexapi.com:443:10.151.20.10 https://onboarding.dev.wexapi.com/health
curl -sk --resolve fintechpartner.dev.wexapi.com:443:10.151.20.10 https://fintechpartner.dev.wexapi.com/health
curl -sk --resolve enterprisemanager.dev.wexapi.com:443:10.151.20.10 https://enterprisemanager.dev.wexapi.com/health
```


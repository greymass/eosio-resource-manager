# Please use with caution

This service was written for use by the Greymass team to manage network resources on our service accounts. 

We have open sourced it as a means to illustrate how a service can be written to manage network resources. Anyone is free to use this code to do the same - but we take no responsibility for the on-chain effects it may have on your accounts. 

**Use at your own risk.**

# Concepts

This system uses a primary account to manage multiple secondary accounts. 

The primary account is an account which:

- Has a dedicated permission to perform the required actions on-chain and a key for that permission loaded into this service.
- Has sufficient RAM available to perform these actions. Each PowerUp or REX rental you perform will temporarily be stored for the duration of the rental. 
- Has a sufficient system token balance to pay for these rentals.

Each secondary account has a set of rules which the primary will follow in order to ensure the secondary accounts remain functional.

As an example, we use the [rentals.gm](https://bloks.io/account/rentals.gm) account loaded into this service as the primary account, which then is used to manage CPU/NET for itself (rentals.gm), the [teamgreymass](https://bloks.io/account/teamgreymass), and [greymassfuel](https://bloks.io/account/greymassfuel) accounts.

# Operating Modes

This system can be configured to use either the PowerUp or REX systems on an EOSIO chain.

# Permissions

The permissions vary depending on which mode of operation you use. 

If you are using the *PowerUp* mode of operation, you will need to create a permission with the following permissions:

- `eosio:powerup` (pay to rent CPU and NET)

If you are using the *REX* mode of operation, you will need to create a permission with the following permissions:

- `eosio:deposit` (deposits into REX)
- `eosio:rentcpu` (uses deposited REX to rent CPU)
- `eosio:rentnet` (uses deposited NET to rent CPU)

You can see an on-chain example of this on the [rentals.gm](https://bloks.io/account/rentals.gm#keys) account for EOS.

# Configuration

The `config` folder contains all of the configuration values. The `default.toml` specifies all of the default account values, which you can override by simply copying the `default.toml` file to `local.toml`. The `local.toml` file is ignored by vcs and overrides the `default.toml` settings allowing you to easily configure the services to manage your accounts.

The configuration themselves are well documented, but the only required things you will need to setup are:

- The account, permission and keys of the primary account.
- The API node you wish to use to send/receive data.
- The `mode` of operations, which defaults to the PowerUp system (EOS).
- An `[[accounts]]` configuration block for each secondary account to manage, along with their individual config.

# Configuring self-management

One thing we would recommend is you define your primary account also as a secondary account. The primary account is going to be using its own CPU/NET/RAM to perform actions on behalf of the secondary accounts. By defining the primary account also as a secondary account, the system will monitor the resources of the primary account to ensure it doesn't run out of resources while attempting to manage the resources of the other secondary accounts.

You can see an example of this in the `default.toml` file, where `rentals.gm` is defined as the primary account but also defined down in the secondary accounts with its own minimum/maximum resource levels.

# Running to test configuration

Once configured, you can test everything locally (provided nodejs is available) by running:

```bash
make dev
```

This will load the live configuration and run the service. Any secondary accounts defined will be processed and transactions issued to manage their accounts. 

**Note:** If you are concerned about this script using your system tokens to pay for resources, we would recommend using a testnet to first learn how this application works.

If you'd like additional information about the processes in the background happening, edit your `local.toml` and change `level = 'info'` to `level = 'debug'` at the bottom. Restart the application and the service will output more verbose logs.

# Running in production

This service comes with both a `Dockerfile` and a `docker-compose.yaml` configuration. You can use these how you see fit, or build the nodejs service and run it in any other manner you'd prefer.

We operate this script by simply cloning, modifying the configuration, and then running `docker-compose build && docker-compose up -d`. 
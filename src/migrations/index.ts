import * as migration_20260305_164431_base_schema from './20260305_164431_base_schema';
import * as migration_20260305_164451_add_network_details from './20260305_164451_add_network_details';
import * as migration_20260306_154836 from './20260306_154836';
import * as migration_20260306_171733_add_exchange_fee_fields from './20260306_171733_add_exchange_fee_fields';
import * as migration_20260306_175925_batch_monitoring from './20260306_175925_batch_monitoring';
import * as migration_20260307_100049_add_api_key_to_users from './20260307_100049_add_api_key_to_users';
import * as migration_20260307_120000_add_usdt_decimals from './20260307_120000_add_usdt_decimals';
import * as migration_20260309_100800 from './20260309_100800';

export const migrations = [
  {
    up: migration_20260305_164431_base_schema.up,
    down: migration_20260305_164431_base_schema.down,
    name: '20260305_164431_base_schema',
  },
  {
    up: migration_20260305_164451_add_network_details.up,
    down: migration_20260305_164451_add_network_details.down,
    name: '20260305_164451_add_network_details',
  },
  {
    up: migration_20260306_154836.up,
    down: migration_20260306_154836.down,
    name: '20260306_154836',
  },
  {
    up: migration_20260306_171733_add_exchange_fee_fields.up,
    down: migration_20260306_171733_add_exchange_fee_fields.down,
    name: '20260306_171733_add_exchange_fee_fields',
  },
  {
    up: migration_20260306_175925_batch_monitoring.up,
    down: migration_20260306_175925_batch_monitoring.down,
    name: '20260306_175925_batch_monitoring',
  },
  {
    up: migration_20260307_100049_add_api_key_to_users.up,
    down: migration_20260307_100049_add_api_key_to_users.down,
    name: '20260307_100049_add_api_key_to_users',
  },
  {
    up: migration_20260307_120000_add_usdt_decimals.up,
    down: migration_20260307_120000_add_usdt_decimals.down,
    name: '20260307_120000_add_usdt_decimals',
  },
  {
    up: migration_20260309_100800.up,
    down: migration_20260309_100800.down,
    name: '20260309_100800'
  },
];

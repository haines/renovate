import { createReadStream } from 'fs';
import { join } from 'upath';
import * as httpMock from '../../../../test/http-mock';
import { getFixturePath, getName, loadFixture } from '../../../../test/util';
import { TerraformProviderDatasource } from '../../../datasource/terraform-provider';
import createHashes from './hash';

const terraformProviderDatasource = new TerraformProviderDatasource();
const releaseBackendUrl = terraformProviderDatasource.defaultRegistryUrls[1];
const releaseBackendAzurerm = loadFixture('releaseBackendAzurerm_2_56_0.json');
const cacheDir = join('/tmp/renovate/cache');

describe(getName(), () => {
  it('returns null if a non hashicorp release is found ', async () => {
    const result = await createHashes('test/gitlab', '2.56.0', cacheDir);
    expect(result).toBeNull();
  });

  it('return null if requesting a version which is not available', async () => {
    httpMock
      .scope(releaseBackendUrl)
      .get('/terraform-provider-azurerm/2.59.0/index.json')
      .reply(403, '');

    const result = await createHashes('hashicorp/azurerm', '2.59.0', cacheDir);
    expect(result).toBeNull();
    expect(httpMock.getTrace()).toMatchSnapshot();
  });

  it('backend index throws error', async () => {
    httpMock
      .scope(releaseBackendUrl)
      .get('/terraform-provider-azurerm/2.56.0/index.json')
      .replyWithError('');

    const result = await createHashes('hashicorp/azurerm', '2.56.0', cacheDir);
    expect(result).toBeNull();
    expect(httpMock.getTrace()).toMatchSnapshot();
  });

  it('fail to create hashes', async () => {
    const readStreamLinux = createReadStream(
      getFixturePath('releaseBackendAzurerm_2_56_0.json')
    );
    const readStreamDarwin = createReadStream(
      getFixturePath('releaseBackendAzurerm_2_56_0.json')
    );
    httpMock
      .scope(releaseBackendUrl)
      .get('/terraform-provider-azurerm/2.56.0/index.json')
      .reply(200, releaseBackendAzurerm)
      .get(
        '/terraform-provider-azurerm/2.56.0/terraform-provider-azurerm_2.56.0_linux_amd64.zip'
      )
      .reply(200, readStreamLinux)
      .get(
        '/terraform-provider-azurerm/2.56.0/terraform-provider-azurerm_2.56.0_darwin_amd64.zip'
      )
      .reply(200, readStreamDarwin);

    const result = await createHashes('hashicorp/azurerm', '2.56.0', cacheDir);
    expect(result).toBeNull();
    expect(httpMock.getTrace()).toMatchSnapshot();
  });

  it('full walkthrough', async () => {
    const readStreamLinux = createReadStream(
      'lib/manager/terraform/lockfile/__fixtures__/test.zip'
    );
    const readStreamDarwin = createReadStream(
      'lib/manager/terraform/lockfile/__fixtures__/test.zip'
    );
    httpMock
      .scope(releaseBackendUrl)
      .get('/terraform-provider-azurerm/2.56.0/index.json')
      .reply(200, releaseBackendAzurerm)
      .get(
        '/terraform-provider-azurerm/2.56.0/terraform-provider-azurerm_2.56.0_linux_amd64.zip'
      )
      .reply(200, readStreamLinux)
      .get(
        '/terraform-provider-azurerm/2.56.0/terraform-provider-azurerm_2.56.0_darwin_amd64.zip'
      )
      .reply(200, readStreamDarwin);

    const result = await createHashes('hashicorp/azurerm', '2.56.0', cacheDir);
    expect(result).not.toBeNull();
    expect(result).toBeArrayOfSize(2);
    expect(result).toMatchSnapshot();
    expect(httpMock.getTrace()).toMatchSnapshot();
  });
});

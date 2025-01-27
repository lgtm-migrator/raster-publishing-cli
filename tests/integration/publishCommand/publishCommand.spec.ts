import { trace } from '@opentelemetry/api';
import jsLogger from '@map-colonies/js-logger';
import { LayerMetadata, ProductType, RecordType } from '@map-colonies/mc-model-types';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { MapPublisherClient } from '../../../src/clients/mapPublisherClient';
import { CatalogClient } from '../../../src/clients/catalogClient';
import { configMock, initConfig, clearConfig, setConfigValue } from '../../mock/config';
import { mapPublisherMock, mapPublishLayerMock } from '../../mock/clients/mapPublisherClient';
import { catalogMock, catalogPublishMock } from '../../mock/clients/catalogClient';
import { PublishCommandCliTrigger } from './helpers/CliTrigger';

describe('PublishCommand', function () {
  let cli: PublishCommandCliTrigger;
  let processExitMock: jest.SpyInstance;

  const nowMock = new Date(10, 10, 3030);

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(nowMock);
  });

  beforeEach(function () {
    initConfig();
    setConfigValue('publicMapServerURL', 'http://test.maps');
    setConfigValue('publicMapServerURL', 'http://test.maps');

    processExitMock = jest.spyOn(global.process, 'exit');
    processExitMock.mockReturnValueOnce(undefined); //prevent cli exit from killing the test

    const app = getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
        { token: SERVICES.CONFIG, provider: { useValue: configMock } },
        { token: MapPublisherClient, provider: { useValue: mapPublisherMock } },
        { token: CatalogClient, provider: { useValue: catalogMock } },
      ],
      useChild: true,
    });

    cli = new PublishCommandCliTrigger(app);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    clearConfig();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Happy Path', function () {
    it('publish all layers from csv', async function () {
      await cli.call('tests/data/test.csv');

      const expectedMapPublishingRequest = [
        [
          {
            name: 'testId1-OrthophotoHistory',
            tilesPath: 'testId1/OrthophotoHistory',
            cacheType: 'file',
            format: 'image/png',
          },
        ],
        [
          {
            name: 'testId2-VectorBest',
            tilesPath: 'testId2/VectorBest',
            cacheType: 's3',
            format: 'image/jpeg',
          },
        ],
      ];
      const layer1Metadata = {
        id: '36a3887b-0e04-4c55-9d6c-09b1f343026c',
        displayPath: '36a3887b-0e04-4c55-9d6c-09b1f343026c',
        productId: 'testId1',
        productName: 'test1',
        productVersion: '1',
        productType: ProductType.ORTHOPHOTO_HISTORY,
        description: 'testdesc1',
        sourceDateStart: new Date(Date.UTC(2011, 10, 5)),
        sourceDateEnd: new Date(Date.UTC(2011, 11, 5)),
        maxResolutionDeg: 0.072,
        maxResolutionMeter: 100,
        footprint: {
          type: 'Polygon',
          coordinates: [
            [
              [-180, -90],
              [-180, 90],
              [180, 90],
              [180, -90],
              [-180, -90],
            ],
          ],
        },
        region: ['reg1', 'reg2'],
        classification: '5',
        scale: 10000,
        //generated fields
        producerName: 'IDFMU',
        sensors: ['UNDEFINED', 'testSensor'],
        srsId: '4326',
        srsName: 'WGS84GEO',
        type: RecordType.RECORD_RASTER,
        productBoundingBox: '-180,-90,180,90',
        minHorizontalAccuracyCE90: 0.8,
        creationDate: undefined,
        includedInBests: undefined,
        ingestionDate: undefined,
        layerPolygonParts: undefined,
        productSubType: undefined,
        rawProductData: undefined,
        rms: undefined,
      } as unknown as LayerMetadata;
      const layer2Metadata = {
        id: '2bcb6f6a-75f5-4119-8070-53b9ed8b2530',
        displayPath: '2bcb6f6a-75f5-4119-8070-53b9ed8b2530',
        productId: 'testId2',
        productName: 'test2',
        productVersion: '1',
        productType: ProductType.VECTOR_BEST,
        sourceDateStart: new Date(Date.UTC(2011, 10, 5)),
        sourceDateEnd: new Date(Date.UTC(2011, 10, 5)),
        maxResolutionDeg: 0.072,
        maxResolutionMeter: 300,
        footprint: {
          type: 'Polygon',
          coordinates: [
            [
              [-180, -90],
              [-180, 90],
              [180, 90],
              [180, -90],
              [-180, -90],
            ],
          ],
        },
        classification: '4',
        //generated fields
        producerName: 'IDFMU',
        sensors: ['UNDEFINED'],
        srsId: '4326',
        srsName: 'WGS84GEO',
        type: RecordType.RECORD_RASTER,
        productBoundingBox: '-180,-90,180,90',
        minHorizontalAccuracyCE90: 0.4,
        creationDate: undefined,
        includedInBests: undefined,
        ingestionDate: undefined,
        layerPolygonParts: undefined,
        productSubType: undefined,
        rawProductData: undefined,
        rms: undefined,
      };
      const expectedCatalogRequest = [
        [
          {
            metadata: layer2Metadata,
            links: [
              {
                description: '',
                name: 'testId2-VectorBest',
                protocol: 'WMS',
                url: 'http://test.maps/service?REQUEST=GetCapabilities',
              },
              {
                description: '',
                name: 'testId2-VectorBest',
                protocol: 'WMS_BASE',
                url: 'http://test.maps/wms',
              },
              {
                description: '',
                name: 'testId2-VectorBest',
                protocol: 'WMTS',
                url: 'http://test.maps/wmts/1.0.0/WMTSCapabilities.xml',
              },
              {
                description: '',
                name: 'testId2-VectorBest',
                protocol: 'WMTS_BASE',
                url: 'http://test.maps/wmts',
              },
              {
                description: '',
                name: 'testId2-VectorBest',
                protocol: 'WMTS_LAYER',
                url: 'http://test.maps/wmts/testId2-VectorBest/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.png',
              },
            ],
          },
        ],
        [
          {
            metadata: layer1Metadata,
            links: [
              {
                description: '',
                name: 'testId1-OrthophotoHistory',
                protocol: 'WMS',
                url: 'http://test.maps/service?REQUEST=GetCapabilities',
              },
              {
                description: '',
                name: 'testId1-OrthophotoHistory',
                protocol: 'WMS_BASE',
                url: 'http://test.maps/wms',
              },
              {
                description: '',
                name: 'testId1-OrthophotoHistory',
                protocol: 'WMTS',
                url: 'http://test.maps/wmts/1.0.0/WMTSCapabilities.xml',
              },
              {
                description: '',
                name: 'testId1-OrthophotoHistory',
                protocol: 'WMTS_BASE',
                url: 'http://test.maps/wmts',
              },
              {
                description: '',
                name: 'testId1-OrthophotoHistory',
                protocol: 'WMTS_LAYER',
                url: 'http://test.maps/wmts/testId1-OrthophotoHistory/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.png',
              },
            ],
          },
        ],
      ];

      expect(mapPublishLayerMock).toHaveBeenCalledTimes(2);
      expect(mapPublishLayerMock.mock.calls).toEqual(expect.arrayContaining(expectedMapPublishingRequest));
      expect(catalogPublishMock).toHaveBeenCalledTimes(2);
      expect(catalogPublishMock.mock.calls).toEqual(expect.arrayContaining(expectedCatalogRequest));
    });
  });
});

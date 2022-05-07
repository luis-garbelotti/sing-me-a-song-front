import supertest from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/database.js';
import recommendationsFactory from '../factories/recommendationsFactory.js';

async function truncateRecommendations() {
  await prisma.$executeRaw`TRUNCATE TABLE recommendations`;
}

async function disconnect() {
  await prisma.$disconnect();
}

describe('Sing me a song Integrations tests', () => {
  beforeEach(truncateRecommendations);
  afterAll(disconnect);

  describe('Up vote: POST /recommendations/:id/upvote', () => {
    it('should increase a vote when up vote and return status 200', async () => {
      const recommendations = recommendationsFactory();

      const createdRecommendation = await prisma.recommendation.upsert({
        where: {
          name: recommendations[0].name,
        },
        update: {},
        create: {
          ...recommendations[0],
        },
      });

      const postResponse = await supertest(app).post(`/recommendations/${createdRecommendation.id}/upvote`);
      const getResponse = await supertest(app).get(`/recommendations/${createdRecommendation.id}`);

      expect(postResponse.status).toEqual(200);
      expect(getResponse.body.score).toEqual(recommendations[0].score + 1);
    });
  });

  describe('Down vote: POST /recommendations/:id/downvote', () => {
    it('should decrease a vote when down vote and return status 200', async () => {
      const recommendations = recommendationsFactory();

      const createdRecommendation = await prisma.recommendation.upsert({
        where: {
          name: recommendations[1].name,
        },
        update: {},
        create: {
          ...recommendations[1],
        },
      });

      const postResponse = await supertest(app).post(`/recommendations/${createdRecommendation.id}/downvote`);
      const getResponse = await supertest(app).get(`/recommendations/${createdRecommendation.id}`);

      expect(postResponse.status).toEqual(200);
      expect(getResponse.body.score).toEqual(recommendations[1].score - 1);
    });

    it('should delete recommendation when score < -5 and return status 200', async () => {
      const recommendations = recommendationsFactory();

      const createdRecommendation = await prisma.recommendation.upsert({
        where: {
          name: recommendations[0].name,
        },
        update: {},
        create: {
          ...recommendations[0],
          score: -5,
        },
      });

      const postResponse = await supertest(app).post(`/recommendations/${createdRecommendation.id}/downvote`);
      const getResponse = await supertest(app).get(`/recommendations/${createdRecommendation.id}`);

      expect(postResponse.status).toEqual(200);
      expect(getResponse.body).toEqual({});
      expect(getResponse.status).toEqual(404);
    });
  });

  describe('GET /recommendations', () => {
    it('should return an array with lenght less or equal 10', async () => {
      const recommendations = recommendationsFactory();

      await prisma.recommendation.createMany({
        data: [...recommendations],
      });

      const lastTenRecommendations = await supertest(app).get('/recommendations');

      expect(lastTenRecommendations.status).toEqual(200);
      expect(lastTenRecommendations.body.length).toBeLessThan(11);
    });
  });

  describe('GET /recommendations/:id', () => {
    it('should return a recommendation whith id equal path id', async () => {
      const recommendations = recommendationsFactory();

      const createdRecommendation = await prisma.recommendation.upsert({
        where: {
          name: recommendations[0].name,
        },
        update: {},
        create: {
          name: recommendations[0].name,
          youtubeLink: recommendations[0].youtubeLink,
          score: recommendations[0].score,
        },
      });

      const selectedRecommendation = await supertest(app).get(`/recommendations/${createdRecommendation.id}`);

      expect(selectedRecommendation.status).toEqual(200);
      expect(selectedRecommendation.body.id).toEqual(createdRecommendation.id);
    });
  });
});
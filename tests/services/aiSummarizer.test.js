import { describe, it, before, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { AISummarizer } from '../../src/services/aiSummarizer.js';

describe('AISummarizer', () => {
  let summarizer;
  let config;

  before(() => {
    config = {
      language: 'ru',
      anthropic: {
        apiKey: 'test-key',
        model: 'claude-3-5-haiku-20241022'
      },
      openai: {
        apiKey: null,
        model: 'gpt-4-turbo-preview'
      }
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should set language to ru if not provided', () => {
      const configWithoutLang = { ...config, language: undefined };
      const sum = new AISummarizer(configWithoutLang);
      expect(sum.config.language).to.equal('ru');
    });

    it('should keep ru language if set', () => {
      summarizer = new AISummarizer(config);
      expect(summarizer.config.language).to.equal('ru');
    });

    it('should accept en language', () => {
      const configEn = { ...config, language: 'en' };
      const sum = new AISummarizer(configEn);
      expect(sum.config.language).to.equal('en');
    });
  });

  describe('ensureRussianLanguage', () => {
    beforeEach(() => {
      summarizer = new AISummarizer(config);
    });

    it('should detect English text', async () => {
      const englishText = 'Hello world, this is an English text with many words';
      const stub = sinon.stub(summarizer, 'translateToRussian').resolves('Привет мир');
      
      const result = await summarizer.ensureRussianLanguage(englishText);
      
      expect(stub.calledOnce).to.be.true;
      expect(result).to.equal('Привет мир');
    });

    it('should keep Russian text unchanged', async () => {
      const russianText = 'Привет мир, это русский текст с множеством слов';
      const stub = sinon.stub(summarizer, 'translateToRussian');
      
      const result = await summarizer.ensureRussianLanguage(russianText);
      
      expect(stub.called).to.be.false;
      expect(result).to.equal(russianText);
    });

    it('should allow specific English terms (AI, GPT, etc)', async () => {
      const mixedText = 'Новости о AI и ChatGPT для бизнеса с GPT моделями';
      const stub = sinon.stub(summarizer, 'translateToRussian');
      
      const result = await summarizer.ensureRussianLanguage(mixedText);
      
      expect(stub.called).to.be.false;
      expect(result).to.equal(mixedText);
    });

    it('should handle empty text', async () => {
      const result = await summarizer.ensureRussianLanguage('');
      expect(result).to.equal('');
    });

    it('should handle null/undefined', async () => {
      expect(await summarizer.ensureRussianLanguage(null)).to.be.null;
      expect(await summarizer.ensureRussianLanguage(undefined)).to.be.undefined;
    });
  });

  describe('extractKeywords', () => {
    beforeEach(() => {
      summarizer = new AISummarizer(config);
    });

    it('should extract AI keywords from text', () => {
      const text = 'Новый чат-бот на базе AI для автоматизации бизнеса';
      const keywords = summarizer.extractKeywords(text);
      
      expect(keywords).to.be.a('string');
      expect(keywords).to.include('чат-бот');
      expect(keywords).to.include('AI');
    });

    it('should return default if no keywords found', () => {
      const text = 'Обычный текст без ключевых слов';
      const keywords = summarizer.extractKeywords(text);
      
      expect(keywords).to.equal('AI business automation and chatbots');
    });

    it('should limit to 3 keywords', () => {
      const text = 'чат-бот AI автоматизация нейросеть бизнес агент';
      const keywords = summarizer.extractKeywords(text);
      
      const keywordCount = keywords.split(', ').length;
      expect(keywordCount).to.be.at.most(3);
    });
  });

  describe('generateDemoSummary', () => {
    beforeEach(() => {
      summarizer = new AISummarizer(config);
    });

    it('should return a demo summary', () => {
      const articles = [{ title: 'Test', description: 'Test' }];
      const summary = summarizer.generateDemoSummary(articles);
      
      expect(summary).to.be.a('string');
      expect(summary.length).to.be.greaterThan(100);
      expect(summary).to.match(/[А-Яа-яЁё]/); // Contains Cyrillic
    });

    it('should include emoji', () => {
      const articles = [{ title: 'Test', description: 'Test' }];
      const summary = summarizer.generateDemoSummary(articles);
      
      expect(summary).to.match(/[🚀🤖✍️]/);
    });
  });

  describe('createPrompt', () => {
    beforeEach(() => {
      summarizer = new AISummarizer(config);
    });

    it('should create Russian prompt when language is ru', () => {
      const articlesText = 'Test article about AI';
      const prompt = summarizer.createPrompt(articlesText);
      
      expect(prompt).to.include('РУССКОМ');
      expect(prompt).to.include('🇷🇺');
      expect(prompt).to.include(articlesText);
    });

    it('should create English prompt when language is en', () => {
      const configEn = { ...config, language: 'en' };
      const sum = new AISummarizer(configEn);
      const articlesText = 'Test article about AI';
      const prompt = sum.createPrompt(articlesText);
      
      expect(prompt).to.include('business English');
      expect(prompt).to.include(articlesText);
      expect(prompt).not.to.include('🇷🇺');
    });

    it('should include requirements in prompt', () => {
      const articlesText = 'Test article';
      const prompt = summarizer.createPrompt(articlesText);
      
      expect(prompt).to.include('450-600');
      expect(prompt).to.include('цифры');
    });
  });

  describe('Integration tests', () => {
    it('should generate summary with fallback if no API keys', async () => {
      const noApiConfig = {
        language: 'ru',
        anthropic: { apiKey: null },
        openai: { apiKey: null }
      };
      const sum = new AISummarizer(noApiConfig);
      
      const articles = [
        {
          title: 'Test Article',
          description: 'Test description',
          source: 'Test Source',
          snippet: 'Test snippet'
        }
      ];
      
      const summary = await sum.generateSummary(articles);
      
      expect(summary).to.be.a('string');
      expect(summary.length).to.be.greaterThan(50);
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      summarizer = new AISummarizer(config);
    });

    it('should handle translate error gracefully', async () => {
      const stub = sinon.stub(summarizer, 'translateToRussian').rejects(new Error('API Error'));
      const text = 'English text that needs translation';
      
      const result = await summarizer.ensureRussianLanguage(text);
      
      // Should return original text on error
      expect(result).to.equal(text);
    });

    it('should handle generateSummary error with demo content', async () => {
      sinon.stub(summarizer.anthropic.messages, 'create').rejects(new Error('API Error'));
      
      const articles = [{ title: 'Test', description: 'Test', source: 'Test' }];
      const summary = await summarizer.generateSummary(articles);
      
      // Should return demo summary
      expect(summary).to.be.a('string');
      expect(summary.length).to.be.greaterThan(50);
    });
  });
});



import Joi from 'joi';

export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

export const runBotSchema = Joi.object({
  force: Joi.boolean().default(false)
});

export const publishSchema = Joi.object({
  postId: Joi.number().optional()
});

export const collectSchema = Joi.object({
  sources: Joi.array().items(Joi.string()).optional()
});

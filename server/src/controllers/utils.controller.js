const axios = require('axios');
const cheerio = require('cheerio');

// @desc    Get link preview metadata
// @route   GET /api/chat/link-preview?url=...
// @access  Private
const getLinkPreview = async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, message: 'URL is required' });

    // Basic URL validation
    try {
      new URL(url);
    } catch (_) {
      return res.status(400).json({ success: false, message: 'Invalid URL format' });
    }

    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'MessageMeBot/1.0',
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const getMetaTag = (name) => {
      return (
        $(`meta[property="og:${name}"]`).attr('content') ||
        $(`meta[name="twitter:${name}"]`).attr('content') ||
        $(`meta[name="${name}"]`).attr('content')
      );
    };

    const metadata = {
      title: getMetaTag('title') || $('title').text() || url,
      description: getMetaTag('description') || '',
      image: getMetaTag('image') || '',
      url: getMetaTag('url') || url,
    };

    res.status(200).json({ success: true, data: metadata });
  } catch (error) {
    // Fail silently for the user, just return empty data so the message still sends
    res.status(200).json({ success: true, data: null });
  }
};

module.exports = {
  getLinkPreview
};

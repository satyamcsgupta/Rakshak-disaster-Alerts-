const Resource = require('../models/Resource');
const { states } = require('./alertController');

const parseCoordinate = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : value;
};

const buildResourcePayload = (body) => ({
  ...body,
  latitude: parseCoordinate(body.latitude),
  longitude: parseCoordinate(body.longitude),
  isActive: body.isActive === 'true'
});

exports.adminResourceList = async (req, res) => {
  const resources = await Resource.find().sort({ state: 1, name: 1 });
  res.render('admin/resources', {
    pageTitle: 'Manage Safe Zones',
    resources
  });
};

exports.newResourceForm = (req, res) => {
  res.render('admin/new-resource', {
    pageTitle: 'Add Safe Zone',
    states,
    resource: null
  });
};

exports.createResource = async (req, res) => {
  try {
    await Resource.create(buildResourcePayload(req.body));
    res.redirect('/admin/resources');
  } catch (error) {
    res.render('admin/new-resource', {
      pageTitle: 'Add Safe Zone',
      states,
      resource: req.body,
      error: 'Failed to create resource. Please check coordinates.'
    });
  }
};

exports.editResourceForm = async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  res.render('admin/new-resource', {
    pageTitle: 'Edit Safe Zone',
    states,
    resource
  });
};

exports.updateResource = async (req, res) => {
  try {
    await Resource.findByIdAndUpdate(req.params.id, buildResourcePayload(req.body), {
      runValidators: true
    });
    res.redirect('/admin/resources?success=updated');
  } catch (error) {
    res.redirect('/admin/resources?error=update_failed');
  }
};

exports.deleteResource = async (req, res) => {
  try {
    await Resource.findByIdAndDelete(req.params.id);
    res.redirect('/admin/resources?success=deleted');
  } catch (error) {
    res.redirect('/admin/resources');
  }
};

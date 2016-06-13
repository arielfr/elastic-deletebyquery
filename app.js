var _ = require('lodash');

module.exports = function(esClient){
    /**
     * If you dont send any query in the body -> body: { query: { term: { _id: 1 } } } it will delete all
     * @param options
     * @param callback
     */
    esClient.deleteByQuery = function(options, callback){
        var dataToDelete = [];

        var defaultOptions = {
            scroll: '30s',
            fields: ['id']
        };

        options = _.merge({}, defaultOptions, options);

        esClient.search(options, function getMoreUntilDone(error, response) {
            if(error){
                callback.apply(null, [error, null]);
                return;
            }

            dataToDelete = _.union(dataToDelete, response.hits.hits);

            if (response.hits.total !== dataToDelete.length) {
                esClient.scroll({
                    scrollId: response._scroll_id,
                    scroll: '30s'
                }, getMoreUntilDone);
            } else {
                if(_.isEmpty(dataToDelete)){
                    callback.apply(null, [null, { status: 'OK', elements: [] }]);
                    return;
                }

                var bulkToDelete = [];

                _.forEach(dataToDelete, function(data){
                    bulkToDelete.push({
                        delete: {
                            _index: options.index,
                            _type: options.type,
                            _id: data._id
                        }
                    });
                });

                esClient.bulk({
                    body: bulkToDelete
                }, function(error, response){
                    if(error){
                        callback.apply(null, [error, null]);
                        return;
                    }

                    callback.apply(null, [null, { status: 'OK', elements: dataToDelete }]);
                });
            }
        });
    };
};
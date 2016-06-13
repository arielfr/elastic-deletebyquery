var _ = require('lodash');

module.exports = function(esClient){
    /**
     * If you dont send any query in the body -> body: { query: { term: { _id: 1 } } } it will delete all
     * @param options
     * @param callback
     */
    esClient.deleteByQuery = function(options, callback){
        var dataToDelete = [],
            dateDeleted = [];

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
                dateDeleted = _.cloneDeep(dataToDelete);

                function deleteData(){
                    if( dataToDelete.length > 0 ){
                        var data = dataToDelete.pop();

                        esClient.delete({
                            index: data._index,
                            type: data._type,
                            id: data._id
                        }, function(err, response){
                            if(err){
                                callback.apply(null, [error, null]);
                                return;
                            }

                            deleteData();
                        });
                    }else{
                        callback.apply(null, [null, { status: 'OK', elements: dataToDelete }]);
                    }
                }

                deleteData();
            }
        });
    };
};